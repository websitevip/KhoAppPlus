(function () {
  const VIDEO_ID = "my-fixed-stream-id"; // Bạn có thể đổi ID cố định nếu muốn

  // Tải PeerJS nếu chưa có
  if (typeof Peer === "undefined") {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js";
    script.onload = initPeerStream;
    document.head.appendChild(script);
  } else {
    initPeerStream();
  }

  function initPeerStream() {
    // Tạo thẻ video nếu chưa có
    let localVideo = document.getElementById("localVideo");
    if (!localVideo) {
      localVideo = document.createElement("video");
      localVideo.id = "localVideo";
      localVideo.autoplay = true;
      localVideo.muted = true;
      localVideo.playsInline = true;
      localVideo.style.display = "none";
      document.body.appendChild(localVideo);
    }

    const peer = new Peer(VIDEO_ID);

    peer.on("open", (id) => {
      console.log("🎥 Peer ID:", id);
      startCamera(peer, localVideo);
    });
  }

  function startCamera(peer, videoElement) {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        videoElement.srcObject = stream;

        // Trả lời cuộc gọi khi có người kết nối
        peer.on("call", (call) => {
          call.answer(stream);
        });
      })
      .catch((error) => {
        console.error("🚫 Không truy cập được camera:", error);
        alert("Không truy cập được camera.");
      });
  }
})();
