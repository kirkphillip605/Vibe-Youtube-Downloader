import { useState } from 'react';
import { Modal, Form, Button, Stack, useToaster, Message, Input } from 'rsuite';
import { Video } from '../types';

interface DirectUrlModalProps {
  open: boolean;
  onClose: () => void;
  onVideoFetched: (video: Video) => void;
}

export default function DirectUrlModal({ open, onClose, onVideoFetched }: DirectUrlModalProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const toaster = useToaster();

  const handleFetch = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    setLoading(true);
    try {
      const video = await window.electron.ipcRenderer.invoke('fetch-video-info', trimmedUrl);
      if (video && video.id) {
        onVideoFetched(video);
        setUrl('');
        onClose();
      } else {
        throw new Error('Invalid video data returned');
      }
    } catch (err: any) {
      console.error(err);
      toaster.push(
        <Message type="error" closable>
          Failed to load video details. Please make sure the URL or video ID is correct.
        </Message>,
        { placement: 'topCenter' }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading && url.trim()) {
      handleFetch();
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="sm" backdrop="static">
      <Modal.Header>
        <Modal.Title style={{ fontWeight: 700, fontSize: 16 }}>Download via YouTube URL</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p style={{ fontSize: 13, color: '#8b949e', marginBottom: 16 }}>
          Paste a YouTube video URL or Video ID below to download it directly without searching.
        </p>
        <Form fluid>
          <Form.Group controlId="direct-url">
            <Form.ControlLabel className="form-label-styled">YouTube URL or ID</Form.ControlLabel>
            <Input
              value={url}
              onChange={setUrl}
              onKeyDown={handleKeyDown}
              placeholder="e.g. https://www.youtube.com/watch?v=... or dQw4w9WgXcQ"
              autoFocus
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Stack justifyContent="flex-end" spacing={8}>
          <Button appearance="subtle" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            appearance="primary"
            disabled={!url.trim()}
            loading={loading}
            onClick={handleFetch}
          >
            Fetch Video
          </Button>
        </Stack>
      </Modal.Footer>
    </Modal>
  );
}
