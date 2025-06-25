const VIDEO_ID = "my-fixed-stream-id";

const peer = new Peer(VIDEO_ID);

peer.on('open', id => {
  console.log("Peer ID:", id);
  startCamera();
});

function startCamera() {
  navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    .then(stream => {
      const video = document.getElementById('localVideo');
      if (video) {
        video.srcObject = stream;
        video.style.display = 'none'; // Ẩn video nếu HTML không có style
      }

      peer.on('call', call => {
        call.answer(stream);
      });
    })
    .catch(error => {
      console.error("Không truy cập được camera:", error);
      alert("Không truy cập được camera.");
    });
}
