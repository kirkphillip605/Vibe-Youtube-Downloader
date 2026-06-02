import fs from 'fs';
import path from 'path';
import https from 'https';
import ffbinaries from 'ffbinaries';
import { execSync } from 'child_process';

const BIN_DIR = path.resolve('bin');

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function setup() {
  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
  }

  const platform = process.platform;
  const arch = process.arch;

  console.log(`Setting up binaries for ${platform}-${arch}...`);

  // 1. Download yt-dlp
  let ytDlpUrl;
  let ytDlpName = 'yt-dlp';

  if (platform === 'darwin') {
    ytDlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';
  } else if (platform === 'win32') {
    ytDlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
    ytDlpName = 'yt-dlp.exe';
  } else {
    ytDlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
  }

  const ytDlpPath = path.join(BIN_DIR, ytDlpName);
  console.log(`Downloading yt-dlp from ${ytDlpUrl}...`);
  try {
    await downloadFile(ytDlpUrl, ytDlpPath);
    if (platform !== 'win32') fs.chmodSync(ytDlpPath, 0o755);
    console.log('yt-dlp downloaded and prepared.');
  } catch (err) {
    console.error('Failed to download yt-dlp:', err.message);
  }

  // 2. Download ffmpeg using ffbinaries
  console.log('Downloading ffmpeg using ffbinaries...');
  return new Promise((resolve, reject) => {
    // ffbinaries uses its own platform detection
    ffbinaries.downloadBinaries(['ffmpeg'], { destination: BIN_DIR }, (err, data) => {
      if (err) {
        console.error('Failed to download ffmpeg:', err);
        reject(err);
      } else {
        console.log('ffmpeg downloaded and extracted.');
        // Ensure execution permissions on non-windows
        if (platform !== 'win32') {
          const ffmpegPath = path.join(BIN_DIR, 'ffmpeg');
          if (fs.existsSync(ffmpegPath)) fs.chmodSync(ffmpegPath, 0o755);
        }
        resolve(data);
      }
    });
  });
}

setup()
  .then(() => console.log('\nBinary setup complete!'))
  .catch((err) => {
    console.error('\nBinary setup failed:', err);
    process.exit(1);
  });
