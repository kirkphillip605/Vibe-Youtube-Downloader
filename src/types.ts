export interface Video {
  id: string;
  title: string;
  uploader: string;
  thumbnails: { url: string }[];
  url: string;
}

export interface DownloadRecord {
  id: string;
  youtube_url: string;
  artist: string;
  title: string;
  manufacturer: string;
  file_path: string;
  thumbnail_url: string;
  created_at: string;
  status?: 'ready' | 'expired' | 'checking';
}

export interface ActiveDownload {
  id: string;
  label: string;
  artist: string;
  title: string;
  manufacturer: string;
  thumbnailUrl?: string;
  percent: number;
  status: 'queued' | 'downloading' | 'processing' | 'complete' | 'error';
  error?: string;
}
