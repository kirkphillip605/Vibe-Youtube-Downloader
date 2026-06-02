import { app, BrowserWindow, ipcMain, dialog, shell, Notification, nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import isDev from 'electron-is-dev';
import { spawn } from 'child_process';
import fs from 'fs';
import { randomUUID } from 'crypto';
import Datastore from 'nedb-promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

async function showDownloadNotification(artist, title, manufacturer, fullPath, thumbnailUrl) {
  let iconImage = undefined;
  if (thumbnailUrl) {
    try {
      const response = await fetch(thumbnailUrl);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      iconImage = nativeImage.createFromBuffer(buffer);
    } catch (e) {
      console.warn('Failed to fetch thumbnail for notification', e);
    }
  }

  const notification = new Notification({
    title: 'Download Complete',
    body: `Video ${artist} - ${title} - ${manufacturer || 'Unknown'}.mp4 has been downloaded successfully.`,
    icon: iconImage,
    actions: [
      { type: 'button', text: 'Show In Folder' }
    ]
  });

  notification.on('action', (event, index) => {
    if (index === 0) {
      shell.showItemInFolder(fullPath);
    }
  });

  notification.on('click', () => {
    shell.showItemInFolder(fullPath);
  });

  notification.show();
}

// Database setup (NeDB)
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'downloads.db');
const settingsPath = path.join(userDataPath, 'settings.db');

const db = Datastore.create({ filename: dbPath, autoload: true });
const settingsDb = Datastore.create({ filename: settingsPath, autoload: true });

// Initialize default settings
async function initSettings() {
  const downloadPath = await settingsDb.findOne({ key: 'download_path' });
  if (!downloadPath) {
    await settingsDb.insert({ key: 'download_path', value: app.getPath('downloads') });
  }
}

initSettings();

async function getSetting(key) {
  const row = await settingsDb.findOne({ key });
  return row ? row.value : null;
}

async function setSetting(key, value) {
  await settingsDb.update({ key }, { $set: { value } }, { upsert: true });
}

async function getBinaryPath(binaryName) {
  const platform = process.platform;
  const isWin = platform === 'win32';
  const binaryWithExt = isWin ? `${binaryName}.exe` : binaryName;

  if (isDev) {
    const localPath = path.join(process.cwd(), 'bin', binaryWithExt);
    if (fs.existsSync(localPath)) return localPath;
    return binaryName;
  } else {
    const resourcesPath = process.resourcesPath;
    const packagedPath = path.join(resourcesPath, 'bin', binaryWithExt);
    if (fs.existsSync(packagedPath)) return packagedPath;
    return binaryName;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'Vibe Youtube Downloader',
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0c0c14',
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// ─── IPC Handlers ────────────────────────────────────────────────────────────

ipcMain.handle('get-settings', async () => {
  return {
    downloadPath: await getSetting('download_path'),
  };
});

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  if (!result.canceled) {
    const selectedPath = result.filePaths[0];
    await setSetting('download_path', selectedPath);
    return selectedPath;
  }
  return null;
});

ipcMain.handle('search-youtube', async (event, query) => {
  return new Promise(async (resolve, reject) => {
    try {
      const ytDlpPath = await getBinaryPath('yt-dlp');
      const ffmpegPath = await getBinaryPath('ffmpeg');

      const args = [
        `ytsearch30:${query}`,
        '--dump-json',
        '--flat-playlist',
        '--no-warnings',
      ];

      if (ffmpegPath !== 'ffmpeg') {
        args.push('--ffmpeg-location', ffmpegPath);
      }

      const proc = spawn(ytDlpPath, args);
      let output = '';
      let errOutput = '';

      proc.stdout.on('data', (data) => { output += data.toString(); });
      proc.stderr.on('data', (data) => { errOutput += data.toString(); });

      proc.on('close', (code) => {
        const videos = output.split('\n')
          .filter(line => line.trim())
          .map(line => {
            try {
              const data = JSON.parse(line);
              return {
                id: data.id,
                title: data.title,
                uploader: data.uploader,
                url: data.url || `https://www.youtube.com/watch?v=${data.id}`,
                thumbnails: data.thumbnails || [{ url: `https://i.ytimg.com/vi/${data.id}/hqdefault.jpg` }]
              };
            } catch {
              return null;
            }
          })
          .filter(v => v !== null);
        resolve(videos);
      });

      proc.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
});

ipcMain.handle('fetch-video-info', async (event, videoUrl) => {
  return new Promise(async (resolve, reject) => {
    try {
      const ytDlpPath = await getBinaryPath('yt-dlp');
      const ffmpegPath = await getBinaryPath('ffmpeg');

      const args = [
        videoUrl,
        '--dump-json',
        '--no-playlist',
        '--no-warnings',
      ];

      if (ffmpegPath !== 'ffmpeg') {
        args.push('--ffmpeg-location', ffmpegPath);
      }

      const proc = spawn(ytDlpPath, args);
      let output = '';
      let errOutput = '';

      proc.stdout.on('data', (data) => { output += data.toString(); });
      proc.stderr.on('data', (data) => { errOutput += data.toString(); });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(errOutput || `yt-dlp exited with code ${code}`));
          return;
        }
        try {
          const data = JSON.parse(output.trim());
          resolve({
            id: data.id,
            title: data.title,
            uploader: data.uploader,
            url: data.webpage_url || data.url || `https://www.youtube.com/watch?v=${data.id}`,
            thumbnails: data.thumbnails || [{ url: `https://i.ytimg.com/vi/${data.id}/hqdefault.jpg` }]
          });
        } catch (err) {
          reject(err);
        }
      });

      proc.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
});

// Non-blocking download: immediately returns { id }, streams progress via IPC events
ipcMain.handle('download-video', async (event, { url, artist, title, manufacturer, thumbnailUrl }) => {
  const id = randomUUID();

  // Fire and forget — don't await
  (async () => {
    try {
      const downloadPath = await getSetting('download_path');
      const sanitize = (s) => s.replace(/[\\/:*?"<>|]/g, '_');
      const fileName = `${sanitize(artist)} - ${sanitize(title)} - ${sanitize(manufacturer || 'Unknown')}.mp4`;
      const fullPath = path.join(downloadPath, fileName);

      const ytDlpPath = await getBinaryPath('yt-dlp');
      const ffmpegPath = await getBinaryPath('ffmpeg');

      const args = [
        url,
        '-f', 'bestvideo+bestaudio/best',
        '--merge-output-format', 'mp4',
        '--postprocessor-args', 'ffmpeg:-c:v libx264 -c:a aac -pix_fmt yuv420p -movflags +faststart',
        '-o', fullPath,
        '--no-playlist',
        '--no-warnings',
        '--newline',
      ];

      if (ffmpegPath !== 'ffmpeg') {
        args.push('--ffmpeg-location', ffmpegPath);
      }

      const proc = spawn(ytDlpPath, args);

      proc.stdout.on('data', (data) => {
        const text = data.toString();
        // Parse yt-dlp progress lines: [download]  42.3% of ...
        const match = text.match(/\[download\]\s+([\d.]+)%/);
        if (match) {
          const percent = Math.min(Math.round(parseFloat(match[1])), 99);
          mainWindow?.webContents.send('download-progress', { id, percent, status: 'downloading' });
        }
        // Detect post-processing (ffmpeg merge)
        if (text.includes('[Merger]') || text.includes('[ffmpeg]')) {
          mainWindow?.webContents.send('download-progress', { id, percent: 99, status: 'processing' });
        }
      });

      proc.stderr.on('data', (data) => {
        console.warn('yt-dlp stderr:', data.toString());
      });

      proc.on('close', async (code) => {
        if (code === 0) {
          try {
            await db.insert({
              id,
              youtube_url: url,
              artist,
              title,
              manufacturer,
              file_path: fullPath,
              thumbnail_url: thumbnailUrl,
              created_at: new Date().toISOString()
            });
            mainWindow?.webContents.send('download-progress', { id, percent: 100, status: 'complete' });
            showDownloadNotification(artist, title, manufacturer, fullPath, thumbnailUrl);
          } catch (dbErr) {
            console.error('DB insert error:', dbErr);
            mainWindow?.webContents.send('download-progress', { id, percent: 0, status: 'error', error: dbErr.message });
          }
        } else {
          mainWindow?.webContents.send('download-progress', { id, percent: 0, status: 'error', error: `yt-dlp exited with code ${code}` });
        }
      });

      proc.on('error', (err) => {
        mainWindow?.webContents.send('download-progress', { id, percent: 0, status: 'error', error: err.message });
      });

    } catch (err) {
      mainWindow?.webContents.send('download-progress', { id, percent: 0, status: 'error', error: err.message });
    }
  })();

  return { id };
});

ipcMain.handle('get-history', async () => {
  return await db.find({}).sort({ created_at: -1 });
});

ipcMain.handle('check-file-exists', (event, filePath) => {
  return fs.existsSync(filePath);
});

// Open the file's location in Finder / Explorer
ipcMain.handle('open-file-location', (event, filePath) => {
  shell.showItemInFolder(filePath);
  return true;
});

// Delete video: remove from disk + DB
ipcMain.handle('delete-video', async (event, id) => {
  try {
    const record = await db.findOne({ id });
    if (!record) throw new Error('Record not found');

    if (record.file_path && fs.existsSync(record.file_path)) {
      fs.unlinkSync(record.file_path);
    }

    await db.remove({ id }, {});
    return { success: true };
  } catch (err) {
    console.error('Delete error:', err);
    throw err;
  }
});

// Update metadata + rename file on disk
ipcMain.handle('update-video-metadata', async (event, { id, artist, title, manufacturer }) => {
  try {
    const record = await db.findOne({ id });
    if (!record) throw new Error('Record not found');

    const sanitize = (s) => s.replace(/[\\/:*?"<>|]/g, '_');
    const downloadPath = await getSetting('download_path');
    const newFileName = `${sanitize(artist)} - ${sanitize(title)} - ${sanitize(manufacturer || 'Unknown')}.mp4`;
    const newFullPath = path.join(downloadPath, newFileName);

    // Rename file if it exists
    if (record.file_path && fs.existsSync(record.file_path)) {
      fs.renameSync(record.file_path, newFullPath);
    }

    await db.update({ id }, { $set: { artist, title, manufacturer, file_path: newFullPath } }, {});
    return { success: true, newPath: newFullPath };
  } catch (err) {
    console.error('Update metadata error:', err);
    throw err;
  }
});

// Get dashboard statistics
ipcMain.handle('get-stats', async () => {
  const all = await db.find({});
  const total = all.length;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recent = all.filter(r => r.created_at >= sevenDaysAgo).length;
  const ready = all.filter(r => r.file_path && fs.existsSync(r.file_path)).length;
  const missing = total - ready;
  return { total, recent, ready, missing };
});

// Open the download folder in Finder / Explorer
ipcMain.handle('open-download-folder', async () => {
  const downloadPath = await getSetting('download_path');
  if (downloadPath) {
    shell.openPath(downloadPath);
  }
  return true;
});

// Re-download: same as download-video but uses existing record data
ipcMain.handle('redownload-video', async (event, id) => {
  try {
    const record = await db.findOne({ id });
    if (!record) throw new Error('Record not found');

    // Reuse the same download flow via fire-and-forget
    const downloadPath = await getSetting('download_path');
    const sanitize = (s) => s.replace(/[\\/:*?"<>|]/g, '_');
    const fileName = `${sanitize(record.artist)} - ${sanitize(record.title)} - ${sanitize(record.manufacturer || 'Unknown')}.mp4`;
    const fullPath = path.join(downloadPath, fileName);

    const ytDlpPath = await getBinaryPath('yt-dlp');
    const ffmpegPath = await getBinaryPath('ffmpeg');

    const args = [
      record.youtube_url,
      '-f', 'bestvideo+bestaudio/best',
      '--merge-output-format', 'mp4',
      '--postprocessor-args', 'ffmpeg:-c:v libx264 -c:a aac -pix_fmt yuv420p -movflags +faststart',
      '-o', fullPath,
      '--no-playlist',
      '--no-warnings',
      '--newline',
    ];

    if (ffmpegPath !== 'ffmpeg') {
      args.push('--ffmpeg-location', ffmpegPath);
    }

    const dlId = randomUUID();

    (async () => {
      const proc = spawn(ytDlpPath, args);

      proc.stdout.on('data', (data) => {
        const text = data.toString();
        const match = text.match(/\[download\]\s+([\d.]+)%/);
        if (match) {
          const percent = Math.min(Math.round(parseFloat(match[1])), 99);
          mainWindow?.webContents.send('download-progress', { id: dlId, percent, status: 'downloading', label: `${record.artist} - ${record.title}` });
        }
        if (text.includes('[Merger]') || text.includes('[ffmpeg]')) {
          mainWindow?.webContents.send('download-progress', { id: dlId, percent: 99, status: 'processing', label: `${record.artist} - ${record.title}` });
        }
      });

      proc.on('close', async (code) => {
        if (code === 0) {
          await db.update({ id }, { $set: { file_path: fullPath, created_at: new Date().toISOString() } }, {});
          mainWindow?.webContents.send('download-progress', { id: dlId, percent: 100, status: 'complete', label: `${record.artist} - ${record.title}` });
          showDownloadNotification(record.artist, record.title, record.manufacturer, fullPath, record.thumbnail_url);
        } else {
          mainWindow?.webContents.send('download-progress', { id: dlId, percent: 0, status: 'error', label: `${record.artist} - ${record.title}`, error: `yt-dlp exited with code ${code}` });
        }
      });

      proc.on('error', (err) => {
        mainWindow?.webContents.send('download-progress', { id: dlId, percent: 0, status: 'error', label: `${record.artist} - ${record.title}`, error: err.message });
      });
    })();

    return { id: dlId };
  } catch (err) {
    console.error('Redownload error:', err);
    throw err;
  }
});
