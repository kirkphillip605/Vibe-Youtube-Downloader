import { useState, useEffect } from 'react';
import { Grid, Row, Col, Panel, Button, Stack, Loader } from 'rsuite';
import FolderFillIcon from '@rsuite/icons/FolderFill';
import SearchIcon from '@rsuite/icons/Search';
import CharacterAuthorizeIcon from '@rsuite/icons/CharacterAuthorize';
import TimeIcon from '@rsuite/icons/Time';
import CheckIcon from '@rsuite/icons/Check';
import WarningRoundIcon from '@rsuite/icons/WarningRound';

interface DashboardStats {
  total: number;
  recent: number;
  ready: number;
  missing: number;
}

interface DashboardTabProps {
  onNavigate: (tab: string) => void;
}

export default function DashboardTab({ onNavigate }: DashboardTabProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadPath, setDownloadPath] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsData, settings] = await Promise.all([
          window.electron.ipcRenderer.invoke('get-stats'),
          window.electron.ipcRenderer.invoke('get-settings'),
        ]);
        setStats(statsData);
        setDownloadPath(settings?.downloadPath || '');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleOpenFolder = async () => {
    await window.electron.ipcRenderer.invoke('open-download-folder');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <Loader size="lg" content="Loading dashboard..." vertical />
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Videos',
      value: stats?.total ?? 0,
      icon: <CharacterAuthorizeIcon />,
      color: '#7c5cfc',
      gradient: 'linear-gradient(135deg, rgba(124,92,252,0.15), rgba(124,92,252,0.05))',
    },
    {
      label: 'Recent Downloads',
      value: stats?.recent ?? 0,
      icon: <TimeIcon />,
      color: '#22d3ee',
      gradient: 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(34,211,238,0.05))',
    },
    {
      label: 'Files Ready',
      value: stats?.ready ?? 0,
      icon: <CheckIcon />,
      color: '#34d399',
      gradient: 'linear-gradient(135deg, rgba(52,211,153,0.15), rgba(52,211,153,0.05))',
    },
    {
      label: 'Files Missing',
      value: stats?.missing ?? 0,
      icon: <WarningRoundIcon />,
      color: '#fbbf24',
      gradient: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.05))',
    },
  ];

  return (
    <div>
      <Grid fluid>
        {/* Stat Cards */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          {statCards.map((card) => (
            <Col xs={24} sm={12} md={6} key={card.label}>
              <Panel
                className="stat-card glass-card"
                style={{
                  background: card.gradient,
                  borderRadius: 16,
                  padding: '4px',
                  marginBottom: 16,
                  height: '100%',
                }}
              >
                <Stack
                  spacing={12}
                  alignItems="center"
                  style={{ padding: '20px 16px' }}
                >
                  <div
                    className="stat-card-icon"
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: `${card.color}1a`,
                      color: card.color,
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                  >
                    {card.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="stat-card-value"
                      style={{
                        fontSize: 28,
                        fontWeight: 700,
                        color: '#e6edf3',
                        lineHeight: 1.1,
                      }}
                    >
                      {card.value}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: '#8b949e',
                        fontWeight: 500,
                        marginTop: 2,
                      }}
                    >
                      {card.label}
                    </div>
                  </div>
                </Stack>
              </Panel>
            </Col>
          ))}
        </Row>

        {/* Download Location */}
        <Row gutter={16}>
          <Col xs={24}>
            <Panel
              className="glass-card"
              style={{ borderRadius: 16, padding: 4, marginBottom: 16 }}
            >
              <div style={{ padding: '20px 16px' }}>
                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#e6edf3',
                    marginBottom: 8,
                    marginTop: 0,
                  }}
                >
                  Download Location
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: '#8b949e',
                    marginBottom: 16,
                  }}
                >
                  Your videos are saved to:
                </p>
                <div className="path-display" style={{ marginBottom: 16 }}>
                  {downloadPath || 'Not configured — go to Settings'}
                </div>
                <Button
                  startIcon={<FolderFillIcon />}
                  appearance="ghost"
                  color="violet"
                  onClick={handleOpenFolder}
                >
                  Open Download Folder
                </Button>
              </div>
            </Panel>
          </Col>
        </Row>
      </Grid>
    </div>
  );
}
