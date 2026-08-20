/**
 * student.js — Student-facing lookup & certificate rendering
 */

const lookupForm = document.getElementById('lookupForm');
const statusMsg = document.getElementById('statusMsg');
const certStage = document.getElementById('certStage');
const certCanvas = document.getElementById('certCanvas');
const genBtn = document.getElementById('genBtn');

function showStatus(text, type) {
  statusMsg.textContent = text;
  statusMsg.className = 'status-msg show ' + type;
}

lookupForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const uid = document.getElementById('uid').value.trim();
  const fullname = document.getElementById('fullname').value.trim();

  if (!CertifyStore.isPublished()) {
    showStatus('No certificates have been published yet. Please check back later or contact the organizer.', 'err');
    certStage.classList.remove('show');
    return;
  }

  const record = CertifyStore.findRosterEntry(uid, fullname);

  if (!record) {
    showStatus('No matching record found. Please check your UID and full name and try again.', 'err');
    certStage.classList.remove('show');
    return;
  }

  showStatus('Match found — rendering your certificate…', 'ok');
  genBtn.disabled = true;
  renderCertificate(record).then(() => {
    genBtn.disabled = false;
    certStage.classList.add('show');
    certStage.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

function renderCertificate(record) {
  return new Promise((resolve) => {
    const imgSrc = CertifyStore.getTemplateImage();
    const fields = CertifyStore.getFields();

    const img = new Image();
    img.onload = () => {
      certCanvas.width = img.width;
      certCanvas.height = img.height;
      const ctx = certCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      fields.forEach(field => {
        const value = record[field.key] !== undefined ? String(record[field.key]) : '';
        ctx.font = `600 ${field.fontSize}px ${field.font}`;
        ctx.fillStyle = field.color;
        ctx.textBaseline = 'middle';

        let drawX = field.x;
        if (field.align === 'center') {
          ctx.textAlign = 'center';
          drawX = field.x + field.w / 2;
        } else if (field.align === 'right') {
          ctx.textAlign = 'right';
          drawX = field.x + field.w;
        } else {
          ctx.textAlign = 'left';
        }

        const drawY = field.y + field.h / 2;
        ctx.fillText(value, drawX, drawY);
      });

      resolve();
    };
    img.src = imgSrc;
  });
}

document.getElementById('downloadBtn').addEventListener('click', () => {
  const link = document.createElement('a');
  const uid = document.getElementById('uid').value.trim() || 'certificate';
  link.download = `certificate-${uid}.png`;
  link.href = certCanvas.toDataURL('image/png');
  link.click();
});

document.getElementById('printBtn').addEventListener('click', () => {
  const dataUrl = certCanvas.toDataURL('image/png');
  const win = window.open('', '_blank');
  win.document.write(`<img src="${dataUrl}" style="max-width:100%;" onload="window.print()">`);
});
