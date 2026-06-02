import { useState, useEffect } from 'react';
import { Modal, Form, Button, Stack, Tag, Divider, useToaster, Message } from 'rsuite';
import EditIcon from '@rsuite/icons/Edit';
import TrashIcon from '@rsuite/icons/Trash';
import ReloadIcon from '@rsuite/icons/Reload';
import { DownloadRecord, ActiveDownload } from '../types';

interface EditModalProps {
  open: boolean;
  record: DownloadRecord | null;
  onClose: () => void;
  onSaved: () => void;
  onAddDownload: (dl: ActiveDownload) => void;
  onOpenDrawer: () => void;
}

export default function EditModal({ open, record, onClose, onSaved, onAddDownload, onOpenDrawer }: EditModalProps) {
  const [artist, setArtist] = useState('');
  const [title, setTitle] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const toaster = useToaster();

  // Pre-populate form fields when record changes or modal opens
  useEffect(() => {
    if (record && open) {
      setArtist(record.artist || '');
      setTitle(record.title || '');
      setManufacturer(record.manufacturer || '');
    }
  }, [record, open]);

  const handleClose = () => {
    onClose();
  };

  const handleSave = async () => {
    if (!record) return;
    setSaving(true);
    try {
      await window.electron.ipcRenderer.invoke('update-video-metadata', {
        id: record.id,
        artist,
        title,
        manufacturer,
      });
      toaster.push(<Message type="success" closable>Metadata saved and file renamed.</Message>, { placement: 'topCenter' });
      onSaved();
      handleClose();
    } catch {
      toaster.push(<Message type="error" closable>Failed to save metadata.</Message>, { placement: 'topCenter' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!record) return;
    setDeleting(true);
    try {
      await window.electron.ipcRenderer.invoke('delete-video', record.id);
      toaster.push(<Message type="success" closable>Video deleted.</Message>, { placement: 'topCenter' });
      onSaved();
      handleClose();
    } catch {
      toaster.push(<Message type="error" closable>Failed to delete video.</Message>, { placement: 'topCenter' });
    } finally {
      setDeleting(false);
    }
  };

  const handleRedownload = async () => {
    if (!record) return;
    try {
      const result = await window.electron.ipcRenderer.invoke('redownload-video', record.id);
      const dl: ActiveDownload = {
        id: result.id,
        label: `${record.artist} - ${record.title}`,
        artist: record.artist,
        title: record.title,
        manufacturer: record.manufacturer,
        thumbnailUrl: record.thumbnail_url,
        percent: 0,
        status: 'queued',
      };
      onAddDownload(dl);
      toaster.push(<Message type="info" closable>Re-download started.</Message>, { placement: 'topCenter' });
      handleClose();
      onOpenDrawer();
    } catch {
      toaster.push(<Message type="error" closable>Failed to start re-download.</Message>, { placement: 'topCenter' });
    }
  };

  if (!record) return null;

  return (
    <Modal open={open} onClose={handleClose} size="sm" backdrop="static">
      <Modal.Header>
        <Modal.Title style={{ fontWeight: 700, fontSize: 16 }}>Edit Video</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <img src={record.thumbnail_url} alt={record.title} className="thumb-preview" style={{ marginBottom: 16 }} />

        <div style={{ marginBottom: 8 }}>
          <Tag color="violet" size="sm">{record.manufacturer || 'Unknown'}</Tag>
          {record.status === 'ready' && <Tag color="green" size="sm" style={{ marginLeft: 6 }}>File Ready</Tag>}
          {record.status === 'expired' && <Tag color="orange" size="sm" style={{ marginLeft: 6 }}>File Missing</Tag>}
        </div>

        <Divider style={{ margin: '12px 0' }} />

        <Form fluid>
          <Form.Group controlId="edit-artist">
            <Form.ControlLabel className="form-label-styled">Artist</Form.ControlLabel>
            <Form.Control name="artist" value={artist} onChange={v => setArtist(v)} placeholder="e.g. Adele" />
          </Form.Group>
          <Form.Group controlId="edit-title">
            <Form.ControlLabel className="form-label-styled">Title</Form.ControlLabel>
            <Form.Control name="title" value={title} onChange={v => setTitle(v)} placeholder="e.g. Hello" />
          </Form.Group>
          <Form.Group controlId="edit-manufacturer">
            <Form.ControlLabel className="form-label-styled">Manufacturer</Form.ControlLabel>
            <Form.Control name="manufacturer" value={manufacturer} onChange={v => setManufacturer(v)} placeholder="e.g. KaraFun, Sing King" />
          </Form.Group>
        </Form>

        <div style={{ fontSize: 11, color: '#8b949e', marginTop: 4 }}>
          Saving will rename the file on disk to: <code style={{ color: '#7c5cfc' }}>{artist} - {title} - {manufacturer || 'Unknown'}.mp4</code>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Stack spacing={8} justifyContent="space-between" style={{ width: '100%' }}>
          <Stack spacing={8}>
            <Button
              startIcon={<ReloadIcon />}
              appearance="ghost"
              color="violet"
              onClick={handleRedownload}
            >
              Re-download
            </Button>
            <Button
              startIcon={<TrashIcon />}
              appearance="ghost"
              color="red"
              loading={deleting}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </Stack>
          <Stack spacing={8}>
            <Button appearance="subtle" onClick={handleClose}>Cancel</Button>
            <Button
              startIcon={<EditIcon />}
              appearance="primary"
              loading={saving}
              onClick={handleSave}
            >
              Save Changes
            </Button>
          </Stack>
        </Stack>
      </Modal.Footer>
    </Modal>
  );
}
