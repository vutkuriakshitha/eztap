// All Firestore reads/writes for EZTAP live here, so pages stay simple.

import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs, setDoc,
  query, where, orderBy, serverTimestamp, onSnapshot, writeBatch, deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';

const byNewest = (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
const mapDocs = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

/* ---------- USERS ---------- */

export async function createUserProfile(uid, data) {
  await setDoc(doc(db, 'users', uid), {
    skills: '',
    bio: '',
    ...data,
    verified: false,
    createdAt: serverTimestamp(),
  });
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const p = { id: snap.id, ...snap.data() };
  p.mode = p.mode || p.role || 'customer'; // older accounts only had `role`
  return p;
}

export async function updateUserProfile(uid, fields) {
  await updateDoc(doc(db, 'users', uid), fields);
}

/* ---------- TASKS ---------- */

const CATEGORIES = [
  'Cleaning', 'Cooking Help', 'Plumbing', 'Electrical', 'Tutoring',
  'Beauty Services', 'Gardening', 'Tech Support', 'Pet Care', 'Delivery',
  'Home Repair', 'Carpentry', 'Appliance Repair', 'Elderly Care',
  'Babysitting', 'Event Help', 'Photography', 'Car Wash',
  'Laundry & Ironing', 'Fitness Trainer', 'Other',
];

export { CATEGORIES };

export async function createTask(taskData) {
  const ref = await addDoc(collection(db, 'tasks'), {
    ...taskData,
    status: 'open',
    createdAt: serverTimestamp(),
    helperId: null,
    helperName: null,
  });
  return ref.id;
}

export async function getOpenTasks() {
  const q = query(
    collection(db, 'tasks'),
    where('status', '==', 'open'),
    orderBy('createdAt', 'desc')
  );
  return mapDocs(await getDocs(q));
}

export async function getTask(taskId) {
  const snap = await getDoc(doc(db, 'tasks', taskId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getTasksByCustomer(customerId) {
  const q = query(collection(db, 'tasks'), where('customerId', '==', customerId));
  return mapDocs(await getDocs(q)).sort(byNewest);
}

export async function getTasksByHelper(helperId) {
  const q = query(collection(db, 'tasks'), where('helperId', '==', helperId));
  return mapDocs(await getDocs(q)).sort(byNewest);
}

// Status moves are enforced again by the security rules.
export async function updateTaskStatus(taskId, status) {
  await updateDoc(doc(db, 'tasks', taskId), { status });
}

// Permanently removes a task. The UI only offers this while nobody has applied;
// the security rules additionally require the task to still be open and owned by the caller.
export async function deleteTask(taskId) {
  await deleteDoc(doc(db, 'tasks', taskId));
}

export async function cancelTask(taskId) {
  await updateDoc(doc(db, 'tasks', taskId), { status: 'cancelled' });
}

// Fails (permission-denied) if the task is no longer open or the helper never applied.
export async function assignHelperToTask(taskId, helperId, helperName) {
  await updateDoc(doc(db, 'tasks', taskId), { helperId, helperName, status: 'assigned' });
}

/* ---------- APPLICATIONS ---------- */
// One application per helper per task: the document id is `${taskId}_${helperId}`.

export async function applyToTask(task, helper) {
  await setDoc(doc(db, 'applications', `${task.id}_${helper.uid}`), {
    taskId: task.id,
    taskTitle: task.title,
    customerId: task.customerId,
    helperId: helper.uid,
    helperName: helper.name,
    message: helper.message || '',
    createdAt: serverTimestamp(),
  });
}

// Customer view: applicants for one of their tasks.
export async function getApplicationsForTask(taskId, customerId) {
  const q = query(
    collection(db, 'applications'),
    where('taskId', '==', taskId),
    where('customerId', '==', customerId)
  );
  return mapDocs(await getDocs(q)).sort(byNewest);
}

// Customer view: every application on every task I posted (for counts).
export async function getApplicationsForCustomer(customerId) {
  const q = query(collection(db, 'applications'), where('customerId', '==', customerId));
  return mapDocs(await getDocs(q));
}

export async function getApplicationsByHelper(helperId) {
  const q = query(collection(db, 'applications'), where('helperId', '==', helperId));
  return mapDocs(await getDocs(q));
}

/* ---------- REVIEWS ---------- */
// One review per task: the document id is the task id.

export async function createReview(reviewData) {
  await setDoc(doc(db, 'reviews', reviewData.taskId), {
    ...reviewData,
    createdAt: serverTimestamp(),
  });
}

export async function getReviewForTask(taskId) {
  const snap = await getDoc(doc(db, 'reviews', taskId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getReviewsForHelper(helperId) {
  const q = query(collection(db, 'reviews'), where('helperId', '==', helperId));
  return mapDocs(await getDocs(q));
}

export async function getHelperSummary(helperId) {
  const [profile, reviews, tasks, vouches] = await Promise.all([
    getUserProfile(helperId), getReviewsForHelper(helperId), getTasksByHelper(helperId), getVouchesForHelper(helperId),
  ]);
  const count = reviews.length;
  const avg = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : null;
  return {
    verified: !!profile?.verified,
    trusted: !!profile?.trusted,
    vouchCount: vouches.length,
    skills: profile?.skills || '',
    ratingAvg: avg,
    ratingCount: count,
    completed: tasks.filter((t) => t.status === 'completed').length,
  };
}

// Everything the public profile page needs, in one call.
export async function getPublicHelperProfile(uid) {
  const [profile, reviews, tasks, vouches] = await Promise.all([
    getUserProfile(uid), getReviewsForHelper(uid), getTasksByHelper(uid), getVouchesForHelper(uid),
  ]);
  if (!profile) return null;
  reviews.sort(byNewest);
  const count = reviews.length;
  const avg = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : null;
  const breakdown = [5, 4, 3, 2, 1].map((n) => ({ stars: n, count: reviews.filter((r) => r.rating === n).length }));
  return {
    profile, reviews, vouches, ratingAvg: avg, ratingCount: count, breakdown,
    completed: tasks.filter((t) => t.status === 'completed').length,
    active: tasks.filter((t) => t.status === 'assigned' || t.status === 'in-progress').length,
  };
}

/* ---------- NOTIFICATIONS ---------- */

export async function notify(toUid, fromUid, text, taskId, link) {
  try {
    await addDoc(collection(db, 'notifications'), {
      toUid, fromUid, text, taskId: taskId || '', link: link || '', read: false, createdAt: serverTimestamp(),
    });
  } catch {
    // A failed notification must never block the main action.
  }
}

export function listenToNotifications(uid, callback) {
  const q = query(collection(db, 'notifications'), where('toUid', '==', uid));
  return onSnapshot(q, (snap) => callback(mapDocs(snap).sort(byNewest)), () => callback([]));
}

export async function markNotificationRead(id) {
  await updateDoc(doc(db, 'notifications', id), { read: true });
}

/* ---------- TRUSTED BADGE (admin-approved) ---------- */

export async function requestTrust(uid, { name, email, phone, proof }) {
  await setDoc(doc(db, 'trustRequests', uid), {
    uid, name, email, phone, proof, status: 'pending', createdAt: serverTimestamp(),
  });
}

export async function getMyTrustRequest(uid) {
  const snap = await getDoc(doc(db, 'trustRequests', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getPendingTrustRequests() {
  const q = query(collection(db, 'trustRequests'), where('status', '==', 'pending'));
  return mapDocs(await getDocs(q)).sort(byNewest);
}

export async function isAdminUser(uid) {
  try {
    return (await getDoc(doc(db, 'admins', uid))).exists();
  } catch {
    return false;
  }
}

// Approve or reject in one atomic write.
export async function decideTrust(uid, approve, note) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'trustRequests', uid), {
    status: approve ? 'approved' : 'rejected',
    note: note || '',
    reviewedAt: serverTimestamp(),
  });
  if (approve) batch.update(doc(db, 'users', uid), { trusted: true });
  await batch.commit();
}

/* ---------- COMMUNITY VOUCHES ---------- */

export async function getVouchesForHelper(helperUid) {
  const q = query(collection(db, 'vouches'), where('helperUid', '==', helperUid));
  return mapDocs(await getDocs(q)).sort(byNewest);
}

// `type` is 'worked' (voucher hired this helper; needs taskId) or 'verified' (voucher is a verified member).
export async function addVouch({ voucherUid, voucherName, helperUid, type, taskId, note }) {
  const data = { voucherUid, voucherName, helperUid, type, note: note || '', createdAt: serverTimestamp() };
  if (type === 'worked') data.taskId = taskId;
  await setDoc(doc(db, 'vouches', `${voucherUid}_${helperUid}`), data);
}

export async function removeVouch(voucherUid, helperUid) {
  await deleteDoc(doc(db, 'vouches', `${voucherUid}_${helperUid}`));
}

// A completed task where `customerId` hired `helperId` (lets the customer vouch as "worked with").
export async function findCompletedTaskWith(customerId, helperId) {
  const tasks = await getTasksByCustomer(customerId);
  return tasks.find((t) => t.helperId === helperId && t.status === 'completed') || null;
}
