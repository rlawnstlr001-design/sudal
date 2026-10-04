// 앱(Capacitor) 안에서만 쓰는 기능. 웹에서는 isApp=false라 건너뛰거나 웹 방식으로 대신한다.
const C = window.Capacitor;
export const isApp = !!C?.isNativePlatform?.();
export const platform = isApp ? C.getPlatform() : 'web';

const plug = (name) => (isApp ? C.registerPlugin(name) : null);
const App = plug('App');
const Haptics = plug('Haptics');
const StatusBar = plug('StatusBar');
const Share = plug('Share');
const Filesystem = plug('Filesystem');
const Notify = plug('LocalNotifications');

const CHECKIN_ID = 8101;
const RETURN_ID = 8102;

export function haptic(kind = 'light') {
  if (!isApp) { try { navigator.vibrate?.(kind === 'light' ? 12 : [20, 40, 30]); } catch { /* 미지원 */ } return; }
  if (platform === 'ios') Haptics.impact({ style: kind === 'light' ? 'LIGHT' : 'MEDIUM' }).catch(() => {});
  else Haptics.vibrate({ duration: kind === 'light' ? 14 : 40 }).catch(() => {});
}

function blobToBase64(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}
export async function shareFile(blob, name, title) {
  if (!isApp) return false;
  try {
    const { uri } = await Filesystem.writeFile({ path: name, data: await blobToBase64(blob), directory: 'CACHE' });
    await Share.share({ title, files: [uri], dialogTitle: title });
  } catch { /* 닫음 */ }
  return true;
}

async function permission(ask) {
  let p = await Notify.checkPermissions();
  if (p.display !== 'granted' && ask) p = await Notify.requestPermissions();
  return p.display === 'granted';
}
async function channel() {
  if (platform === 'android') {
    await Notify.createChannel({ id: 'otter', name: '수달 소식', description: '아침 인사·마실 귀환 (하루 최대 2번)', importance: 4, vibration: true }).catch(() => {});
  }
}

// 아침 인사 (매일 같은 시각, 하루 1번). time = 'HH:MM' 또는 null(끄기)
export async function scheduleCheckin(time, title, body, ask = false) {
  if (!isApp) return false;
  try {
    await Notify.cancel({ notifications: [{ id: CHECKIN_ID }] }).catch(() => {});
    if (!time) return true;
    if (!(await permission(ask))) return false;
    await channel();
    const [hour, minute] = time.split(':').map(Number);
    await Notify.schedule({ notifications: [{ id: CHECKIN_ID, title, body, channelId: 'otter', schedule: { on: { hour, minute }, allowWhileIdle: true }, extra: { hash: '#/' } }] });
    return true;
  } catch { return false; }
}

// 마실 귀환 알림 (돌아오는 시각에 한 번)
export async function scheduleReturn(atMs, title, body) {
  if (!isApp) return false;
  try {
    await Notify.cancel({ notifications: [{ id: RETURN_ID }] }).catch(() => {});
    if (!atMs || !(await permission(false))) return false;
    await channel();
    await Notify.schedule({ notifications: [{ id: RETURN_ID, title, body, channelId: 'otter', schedule: { at: new Date(atMs), allowWhileIdle: true }, extra: { hash: '#/' } }] });
    return true;
  } catch { return false; }
}

export function initNative({ onBack, onOpenHash, onResume }) {
  if (!isApp) return;
  document.documentElement.classList.add('is-app', `is-${platform}`);
  StatusBar.setStyle({ style: 'LIGHT' }).catch(() => {});
  if (platform === 'android') StatusBar.setBackgroundColor({ color: '#FBF4EC' }).catch(() => {});
  App.addListener('backButton', () => { if (!onBack()) App.exitApp(); });
  App.addListener('resume', () => onResume?.());
  Notify.addListener('localNotificationActionPerformed', ({ notification }) => {
    const h = notification?.extra?.hash;
    if (h) onOpenHash(h);
  });
}
