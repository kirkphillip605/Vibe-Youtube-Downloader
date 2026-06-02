import { useState, useEffect } from 'react';
import { Modal, Form, Button, SelectPicker, Stack, useToaster, Message } from 'rsuite';
import DownloadIcon from '@rsuite/icons/Export';
import { Video, ActiveDownload } from '../types';

interface DownloadModalProps {
  video: Video | null;
  onClose: () => void;
  onAddDownload: (dl: ActiveDownload) => void;
  onOpenDrawer: () => void;
}

function parseMetadata(video: Video) {
  let artist = '';
  let title = '';
  let manufacturer = '';

  const uploaderId = video.uploader?.toLowerCase().replace(/\s+/g, '') || '';

  if (uploaderId.includes('karafun')) {
    const m = video.title.match(/^(.*?) - (.*?) \| Karaoke Version \| KaraFun$/i);
    if (m) { title = m[1].trim(); artist = m[2].trim(); manufacturer = 'KaraFun'; }
  } else if (uploaderId.includes('zoomkaraoke')) {
    const m = video.title.match(/^(.*?) - (.*?) Karaoke Version from Zoom Karaoke$/i);
    if (m) { artist = m[1].trim(); title = m[2].trim(); manufacturer = 'Zoom'; }
  } else if (uploaderId.includes('partytyme')) {
    const m = video.title.match(/^(.*?) - (.*?) \(Karaoke Version\)$/i);
    if (m) { artist = m[1].trim(); title = m[2].trim(); manufacturer = 'Party Tyme'; }
  } else if (uploaderId.includes('singking')) {
    const m = video.title.match(/^(.*?) - (.*?) \(Karaoke Version\)$/i);
    if (m) { artist = m[1].trim(); title = m[2].trim(); manufacturer = 'Sing King'; }
  }

  return { artist, title, manufacturer };
}

export default function DownloadModal({ video, onClose, onAddDownload, onOpenDrawer }: DownloadModalProps) {
  const [artist, setArtist] = useState('');
  const [title, setTitle] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const toaster = useToaster();

  // Pre-populate form when video changes
  useEffect(() => {
    if (video) {
      const parsed = parseMetadata(video);
      setArtist(parsed.artist);
      setTitle(parsed.title);
      setManufacturer(parsed.manufacturer);
    } else {
      setArtist('');
      setTitle('');
      setManufacturer('');
    }
  }, [video]);

  const canStart = artist.trim() && title.trim() && manufacturer.trim();

  const handleStart = async () => {
    if (!video || !canStart) return;
    try {
      const result = await window.electron.ipcRenderer.invoke('download-video', {
        url: video.url,
        artist: artist.trim(),
        title: title.trim(),
        manufacturer: manufacturer.trim(),
        thumbnailUrl: video.thumbnails[0]?.url,
      });

      const dl: ActiveDownload = {
        id: result.id,
        label: `${artist} - ${title}`,
        artist: artist.trim(),
        title: title.trim(),
        manufacturer: manufacturer.trim(),
        thumbnailUrl: video.thumbnails[0]?.url,
        percent: 0,
        status: 'queued',
      };

      onAddDownload(dl);
      toaster.push(<Message type="success" closable>Download started! Track it in Active Downloads.</Message>, { placement: 'topCenter' });
      onClose();
      onOpenDrawer();
    } catch {
      toaster.push(<Message type="error" closable>Failed to start download.</Message>, { placement: 'topCenter' });
    }
  };

  const manufacturerOptions = ['KaraFun', 'Sing King', 'Party Tyme', 'Zoom'].map(v => ({ label: v, value: v }));

  return (
    <Modal open={!!video} onClose={onClose} size="sm" backdrop="static">
      <Modal.Header>
        <Modal.Title style={{ fontWeight: 700, fontSize: 16 }}>Download Settings</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {video && (
          <img src={video.thumbnails[0]?.url} alt={video.title} className="thumb-preview" style={{ marginBottom: 16 }} />
        )}
        <p style={{ fontSize: 13, color: '#8b949e', marginBottom: 16 }}>
          Set the metadata for your MP4 file. The filename will be: <code style={{ color: '#7c5cfc' }}>{artist || 'Artist'} - {title || 'Title'} - {manufacturer || 'Manufacturer'}.mp4</code>
        </p>
        <Form fluid>
          <Form.Group controlId="dl-artist">
            <Form.ControlLabel className="form-label-styled">Artist</Form.ControlLabel>
            <Form.Control name="artist" value={artist} onChange={v => setArtist(v)} placeholder="e.g. Adele" />
          </Form.Group>
          <Form.Group controlId="dl-title">
            <Form.ControlLabel className="form-label-styled">Title</Form.ControlLabel>
            <Form.Control name="title" value={title} onChange={v => setTitle(v)} placeholder="e.g. Hello" />
          </Form.Group>
          <Form.Group controlId="dl-manufacturer">
            <Form.ControlLabel className="form-label-styled">Manufacturer</Form.ControlLabel>
            <SelectPicker
              data={manufacturerOptions}
              value={manufacturer}
              onChange={v => setManufacturer(v || '')}
              creatable
              style={{ width: '100%' }}
              placeholder="Select or type..."
              menuStyle={{ zIndex: 9999 }}
            />
          </Form.Group>
        </Form>
        <div className="info-box" style={{ marginTop: 8 }}>
          💡 Once started, you can go back to searching while the download runs in the background.
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Stack justifyContent="flex-end" spacing={8}>
          <Button appearance="subtle" onClick={onClose}>Cancel</Button>
          <Button
            startIcon={<DownloadIcon />}
            appearance="primary"
            disabled={!canStart}
            onClick={handleStart}
          >
            Start Download
          </Button>
        </Stack>
      </Modal.Footer>
    </Modal>
  );
}
