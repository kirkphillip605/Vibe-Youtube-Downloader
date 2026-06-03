import { useState, useEffect, useCallback } from 'react';
import {
  Container, Header, Sidebar, Content,
  Navbar, Nav, Sidenav,
  InputGroup, Input, SelectPicker, Badge, Stack, IconButton, Button, Modal
} from 'rsuite';
import DashboardIcon from '@rsuite/icons/Dashboard';
import SearchIcon from '@rsuite/icons/Search';
import ListIcon from '@rsuite/icons/List';
import GearIcon from '@rsuite/icons/Gear';
import ArrowDownIcon from '@rsuite/icons/ArrowDown';
import LinkIcon from '@rsuite/icons/legacy/Link';
import PlayOutlineIcon from '@rsuite/icons/PlayOutline';

import { Video, ActiveDownload } from './types';
import DashboardTab from './components/DashboardTab';
import SearchTab from './components/SearchTab';
import HistoryTab from './components/HistoryTab';
import SettingsTab from './components/SettingsTab';
import DownloadModal from './components/DownloadModal';
import ActiveDownloadsDrawer from './components/ActiveDownloadsDrawer';
import DirectUrlModal from './components/DirectUrlModal';

type Tab = 'dashboard' | 'search' | 'videos' | 'settings';

const sourceOptions = ['All Videos', 'All Karaoke', 'KaraFun', 'Sing King', 'Zoom', 'Party Tyme'].map(v => ({ label: v, value: v }));

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [downloads, setDownloads] = useState<ActiveDownload[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState<any>(null);
  const [updatePending, setUpdatePending] = useState(false);

  // Search state (lifted from SearchTab)
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<string>('All Videos');
  const [results, setResults] = useState<Video[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Listen for download progress events from main process
  useEffect(() => {
    const handler = (event: { id: string; percent: number; status: ActiveDownload['status']; error?: string; label?: string }) => {
      setDownloads(prev => prev.map(dl =>
        dl.id === event.id
          ? { ...dl, percent: event.percent, status: event.status, error: event.error }
          : dl
      ));
    };

    window.electron.ipcRenderer.on('download-progress', handler);
    
    // Check if download path is configured
    window.electron.ipcRenderer.invoke('get-settings').then((settings: any) => {
      if (!settings.downloadPath) {
        setSetupModalOpen(true);
      }
    });

    const handleUpdateAvailable = (info: any) => {
      setUpdateAvailable(info);
    };
    window.electron.ipcRenderer.on('update-available', handleUpdateAvailable);

    return () => {
      window.electron.ipcRenderer.removeAllListeners('download-progress');
      window.electron.ipcRenderer.removeAllListeners('update-available');
    };
  }, []);

  const handleSelectSetupDirectory = async () => {
    const selected = await window.electron.ipcRenderer.invoke('select-directory');
    if (selected) {
      setSetupModalOpen(false);
    }
  };

  const handleAddDownload = useCallback((dl: ActiveDownload) => {
    setDownloads(prev => [dl, ...prev]);
  }, []);

  const handleDismiss = (id: string) => {
    setDownloads(prev => prev.filter(d => d.id !== id));
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setHasSearched(true);
    // Auto-switch to search tab when searching
    setActiveTab('search');
    let mod = query;
    if (source === 'All Karaoke') {
      mod = `${query} karaoke`;
    } else if (['KaraFun', 'Sing King', 'Zoom', 'Party Tyme'].includes(source)) {
      mod = `${query} ${source} Karaoke`;
    }
    try {
      const data = await window.electron.ipcRenderer.invoke('search-youtube', mod);
      setResults(data || []);
    } finally {
      setSearching(false);
    }
  };

  const onSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const activeCount = downloads.filter(d => d.status !== 'complete' && d.status !== 'error').length;

  useEffect(() => {
    if (updatePending && activeCount === 0) {
      window.electron.ipcRenderer.invoke('trigger-update');
      setUpdatePending(false);
      setUpdateAvailable(null);
    }
  }, [updatePending, activeCount]);

  return (
    <Container className="app-shell">
      {/* ── Top Navbar ─────────────────────────────────────── */}
      <Header className="app-header">
        <Navbar appearance="subtle" className="app-navbar">
          <Navbar.Brand className="app-navbar-brand" style={{ display: 'flex', alignItems: 'center' }}>
            <PlayOutlineIcon style={{ color: '#ef4444', fontSize: '24px', marginRight: '8px' }} />
            <span className="navbar-logo-text" style={{ fontSize: '18px', fontWeight: 'bold' }}>Vibe Youtube Downloader</span>
          </Navbar.Brand>

          <Stack
            className="navbar-search-area"
            spacing={8}
            alignItems="center"
            justifyContent="center"
            style={{ flex: 1 }}
          >
            <InputGroup className="navbar-search-input" size="md">
              <InputGroup.Addon><SearchIcon /></InputGroup.Addon>
              <Input
                placeholder="Search karaoke videos..."
                value={query}
                onChange={setQuery}
                onKeyDown={onSearchKeyDown}
              />
            </InputGroup>
            <SelectPicker
              data={sourceOptions}
              value={source}
              onChange={v => setSource(v || 'All Videos')}
              searchable={false}
              cleanable={false}
              size="md"
              style={{ width: 130 }}
              placeholder="Source"
              className="navbar-source-picker"
            />
            <IconButton
              icon={<SearchIcon />}
              appearance="primary"
              size="md"
              onClick={handleSearch}
              loading={searching}
              className="navbar-search-btn"
            />
          </Stack>

          <Stack spacing={12} alignItems="center" className="navbar-actions">
            <Button
              appearance="primary"
              size="md"
              onClick={() => setUrlModalOpen(true)}
              className="navbar-paste-btn"
              startIcon={<LinkIcon />}
            >
              Paste URL
            </Button>
            <Badge content={activeCount > 0 ? activeCount : false} color="violet">
              <Button
                appearance="primary"
                size="md"
                onClick={() => setDrawerOpen(true)}
                className="navbar-downloads-btn"
                title="Queue"
                startIcon={<ArrowDownIcon />}
              >
                Queue
              </Button>
            </Badge>
          </Stack>
        </Navbar>
      </Header>

      {/* ── Body: Sidebar + Content ────────────────────────── */}
      <Container className="app-body">
        <Sidebar className="app-sidebar" width={200}>
          <Sidenav appearance="subtle" className="app-sidenav">
            <Sidenav.Body>
              <Nav
                activeKey={activeTab}
                onSelect={(key) => setActiveTab(key as Tab)}
              >
                <Nav.Item eventKey="dashboard" icon={<DashboardIcon />}>
                  Dashboard
                </Nav.Item>
                <Nav.Item eventKey="search" icon={<SearchIcon />}>
                  Search
                </Nav.Item>
                <Nav.Item eventKey="videos" icon={<ListIcon />}>
                  Videos
                </Nav.Item>
                <Nav.Item eventKey="settings" icon={<GearIcon />}>
                  Settings
                </Nav.Item>
              </Nav>
            </Sidenav.Body>
            {updateAvailable && (
              <div style={{ padding: '20px', borderTop: '1px solid var(--app-glass-border)', marginTop: 'auto' }}>
                <Button 
                  appearance="primary" 
                  color="violet" 
                  block
                  onClick={() => {
                    if (activeCount === 0) {
                      window.electron.ipcRenderer.invoke('trigger-update');
                      setUpdateAvailable(null);
                    } else {
                      setUpdatePending(true);
                    }
                  }}
                >
                  {updatePending ? 'Update Pending...' : 'Update Available'}
                </Button>
              </div>
            )}
          </Sidenav>
        </Sidebar>

        <Content className="app-content">
          <div className="content-body">
            {activeTab === 'dashboard' && (
              <DashboardTab onNavigate={(tab) => setActiveTab(tab as Tab)} />
            )}
            {activeTab === 'search' && (
              <SearchTab
                results={results}
                searching={searching}
                hasSearched={hasSearched}
                onSelectVideo={setSelectedVideo}
              />
            )}
            {activeTab === 'videos' && (
              <HistoryTab
                onAddDownload={handleAddDownload}
                onOpenDrawer={() => setDrawerOpen(true)}
              />
            )}
            {activeTab === 'settings' && <SettingsTab />}
          </div>
        </Content>
      </Container>

      {/* ── Download Settings Modal ───────────────────────────── */}
      <DownloadModal
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
        onAddDownload={handleAddDownload}
        onOpenDrawer={() => setDrawerOpen(true)}
      />

      {/* ── Direct URL Download Modal ────────────────────────── */}
      <DirectUrlModal
        open={urlModalOpen}
        onClose={() => setUrlModalOpen(false)}
        onVideoFetched={setSelectedVideo}
      />

      {/* ── Active Downloads Drawer ───────────────────────────── */}
      <ActiveDownloadsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        downloads={downloads}
        onDismiss={handleDismiss}
      />

      {/* ── First-Launch Setup Modal ───────────────────────────── */}
      <Modal backdrop="static" keyboard={false} open={setupModalOpen} onClose={() => {}}>
        <Modal.Header closeButton={false}>
          <Modal.Title>Welcome to Vibe YT Karaoke Tool</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Before you get started, please select a folder where your karaoke videos will be saved.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button appearance="primary" onClick={handleSelectSetupDirectory}>
            Select Download Folder
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
