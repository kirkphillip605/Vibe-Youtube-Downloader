import { useState, useEffect } from 'react';
import {
  Table, Tag, IconButton, Stack, Pagination, useToaster, Message, Modal, Button
} from 'rsuite';
import FolderFillIcon from '@rsuite/icons/FolderFill';
import EditIcon from '@rsuite/icons/Edit';
import TrashIcon from '@rsuite/icons/Trash';
import { DownloadRecord, ActiveDownload } from '../types';
import EditModal from './EditModal';

const { Column, HeaderCell, Cell } = Table;

interface HistoryTabProps {
  onAddDownload: (dl: ActiveDownload) => void;
  onOpenDrawer: () => void;
}

export default function HistoryTab({ onAddDownload, onOpenDrawer }: HistoryTabProps) {
  const [history, setHistory] = useState<DownloadRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [editRecord, setEditRecord] = useState<DownloadRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DownloadRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toaster = useToaster();
  const limit = 10;

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data: DownloadRecord[] = await window.electron.ipcRenderer.invoke('get-history');
      if (data) {
        const withStatus = await Promise.all(data.map(async item => {
          try {
            const exists = await window.electron.ipcRenderer.invoke('check-file-exists', item.file_path);
            return { ...item, status: (exists ? 'ready' : 'expired') as DownloadRecord['status'] };
          } catch {
            return { ...item, status: 'expired' as DownloadRecord['status'] };
          }
        }));
        setHistory(withStatus);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFolder = async (item: DownloadRecord) => {
    try {
      await window.electron.ipcRenderer.invoke('open-file-location', item.file_path);
    } catch {
      toaster.push(<Message type="error" closable>Could not open folder.</Message>, { placement: 'topCenter' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await window.electron.ipcRenderer.invoke('delete-video', deleteTarget.id);
      toaster.push(<Message type="success" closable>Video deleted.</Message>, { placement: 'topCenter' });
      setDeleteTarget(null);
      fetchHistory();
    } catch {
      toaster.push(<Message type="error" closable>Failed to delete.</Message>, { placement: 'topCenter' });
    } finally {
      setDeleting(false);
    }
  };

  const start = (page - 1) * limit;
  const pageData = history.slice(start, start + limit);

  const StatusCell = ({ rowData, ...props }: any) => (
    <Cell {...props}>
      {rowData.status === 'ready' && <Tag className="tag-ready">File Ready</Tag>}
      {rowData.status === 'checking' && <Tag className="tag-processing">Processing</Tag>}
      {rowData.status === 'expired' && <Tag className="tag-missing">File Missing</Tag>}
    </Cell>
  );

  const ThumbCell = ({ rowData, ...props }: any) => (
    <Cell {...props} style={{ padding: '6px 10px' }}>
      <Stack spacing={10} alignItems="center">
        <img
          src={rowData.thumbnail_url}
          alt={rowData.title}
          style={{ width: 64, aspectRatio: '16/9', objectFit: 'cover', borderRadius: 6, border: '1px solid var(--app-glass-border)', flexShrink: 0 }}
        />
        <span style={{ fontSize: 13, color: 'var(--app-text-primary)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {rowData.title}
        </span>
      </Stack>
    </Cell>
  );

  const ActionsCell = ({ rowData, ...props }: any) => (
    <Cell {...props} style={{ padding: '6px 10px' }}>
      <Stack spacing={4} alignItems="center">
        <IconButton
          icon={<FolderFillIcon />}
          size="sm"
          appearance="subtle"
          title="Open file location"
          onClick={() => handleOpenFolder(rowData)}
        />
        <IconButton
          icon={<EditIcon />}
          size="sm"
          appearance="subtle"
          color="violet"
          title="Edit metadata"
          onClick={() => setEditRecord(rowData)}
        />
        <IconButton
          icon={<TrashIcon />}
          size="sm"
          appearance="subtle"
          color="red"
          title="Delete"
          onClick={() => setDeleteTarget(rowData)}
        />
      </Stack>
    </Cell>
  );

  return (
    <div>
      <Table
        data={pageData}
        loading={loading}
        autoHeight
        rowHeight={72}
        bordered={false}
        style={{ background: 'transparent' }}
        rowClassName={() => 'history-row'}
      >
        <Column flexGrow={3} minWidth={200}>
          <HeaderCell>Video</HeaderCell>
          <ThumbCell />
        </Column>
        <Column flexGrow={1} minWidth={110}>
          <HeaderCell>Artist</HeaderCell>
          <Cell dataKey="artist" style={{ color: 'var(--app-text-primary)', fontSize: 13 }} />
        </Column>
        <Column flexGrow={1} minWidth={110}>
          <HeaderCell>Title</HeaderCell>
          <Cell dataKey="title" style={{ color: 'var(--app-text-primary)', fontSize: 13 }} />
        </Column>
        <Column flexGrow={1} minWidth={110}>
          <HeaderCell>Manufacturer</HeaderCell>
          <Cell dataKey="manufacturer" style={{ color: 'var(--app-text-secondary)', fontSize: 12 }} />
        </Column>
        <Column width={120} align="center">
          <HeaderCell>Status</HeaderCell>
          <StatusCell />
        </Column>
        <Column width={120} align="center">
          <HeaderCell>Actions</HeaderCell>
          <ActionsCell />
        </Column>
      </Table>

      {history.length > limit && (
        <div style={{ padding: '16px 0', display: 'flex', justifyContent: 'flex-end' }}>
          <Pagination
            total={history.length}
            limit={limit}
            activePage={page}
            onChangePage={setPage}
            layout={['pager', 'skip']}
          />
        </div>
      )}

      <EditModal
        open={!!editRecord}
        record={editRecord}
        onClose={() => setEditRecord(null)}
        onSaved={fetchHistory}
        onAddDownload={onAddDownload}
        onOpenDrawer={onOpenDrawer}
      />

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} size="xs">
        <Modal.Header><Modal.Title>Delete Video</Modal.Title></Modal.Header>
        <Modal.Body>
          <p style={{ color: 'var(--app-text-primary)' }}>
            Are you sure you want to delete <strong>{deleteTarget?.artist} - {deleteTarget?.title}</strong>?
            This will remove the file from disk and the database.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Stack justifyContent="flex-end" spacing={8}>
            <Button appearance="subtle" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button appearance="primary" color="red" loading={deleting} onClick={handleDelete}>Delete</Button>
          </Stack>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
