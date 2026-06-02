import { Loader, IconButton } from 'rsuite';
import DownloadIcon from '@rsuite/icons/Export';
import { Video } from '../types';

interface SearchTabProps {
  results: Video[];
  searching: boolean;
  hasSearched: boolean;
  onSelectVideo: (video: Video) => void;
}

export default function SearchTab({ results, searching, hasSearched, onSelectVideo }: SearchTabProps) {
  return (
    <div>
      <div className="info-box">
        💡 Use the search bar above to find karaoke videos. Results download directly to your configured folder.
      </div>

      {/* Results */}
      {searching ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Loader size="lg" content="Searching YouTube..." vertical />
        </div>
      ) : results.length === 0 ? (
        hasSearched ? (
          <div className="empty-state"><p>No results found. Try a different search.</p></div>
        ) : (
          <div className="empty-state">
            <p>Search for a karaoke track above to get started.</p>
          </div>
        )
      ) : (
        <div className="results-grid">
          {results.map(video => (
            <div key={video.id} className="video-card" onClick={() => onSelectVideo(video)}>
              <div className="video-card-thumb">
                <img src={video.thumbnails[0]?.url} alt={video.title} loading="lazy" />
                <div className="video-card-overlay">
                  <IconButton
                    icon={<DownloadIcon />}
                    appearance="primary"
                    circle
                    size="lg"
                    onClick={e => { e.stopPropagation(); onSelectVideo(video); }}
                    style={{ background: '#7c5cfc', border: 'none' }}
                  />
                </div>
              </div>
              <div className="video-card-info">
                <p className="video-card-title">{video.title}</p>
                {video.uploader && <p className="video-card-uploader">{video.uploader}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
