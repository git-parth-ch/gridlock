import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import './index.css';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

const MEDAL = ['🥇', '🥈', '🥉'];

const STATUS_CONFIG = {
  active: { label: 'ACTIVE', color: 'status-active', dot: 'dot-active' },
  frozen: { label: 'FROZEN', color: 'status-frozen', dot: 'dot-frozen' },
  disqualified: { label: 'OUT', color: 'status-out', dot: 'dot-out' },
  advanced: { label: 'ADVANCED ✓', color: 'status-adv', dot: 'dot-adv' },
};

export default function Leaderboard() {
  const [teams, setTeams] = useState([]);
  const [eventStatus, setEventStatus] = useState('waiting');
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lb, status] = await Promise.all([
          axios.get(`${BACKEND}/api/leaderboard`),
          axios.get(`${BACKEND}/api/leaderboard/status`),
        ]);
        setTeams(lb.data);
        setEventStatus(status.data.status || 'waiting');
        setLastUpdate(new Date());
      } catch (err) {
        console.error('Fetch error:', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const socket = io(BACKEND, {
      transports: ['websocket'],
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('event_started', () => setEventStatus('active'));
    socket.on('event_ended', () => setEventStatus('ended'));
    socket.on('event_restarted', () => setEventStatus('waiting'));

    return () => socket.disconnect();
  }, []);

  const activeTeams = teams.filter(t => t.status !== 'disqualified' && t.status !== 'waiting');
  const top9 = activeTeams.slice(0, 9);
  const disqualified = teams.filter(t => t.status === 'disqualified');

  // Prepare list with cut line
  const displayItems = [];
  activeTeams.forEach((team, i) => {
    if (i === 9) displayItems.push({ isCutLine: true, code: 'cut-line' });
    displayItems.push({ ...team, rank: i + 1, isTop9: i < 9 });
  });

  // Split into columns for projector (e.g., max 14 rows per col)
  const numColumns = Math.max(1, Math.ceil(displayItems.length / 14));
  const itemsPerCol = Math.ceil(displayItems.length / numColumns);
  const columns = [];
  for (let i = 0; i < displayItems.length; i += itemsPerCol) {
    columns.push(displayItems.slice(i, i + itemsPerCol));
  }

  return (
    <div className="leaderboard-container">
      <div className="header">
        <div className="title-container">
          <h1>GRID<span className="accent">LOCK</span></h1>
          <div style={{ color: 'white', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: '0.1em', marginTop: '0.2rem' }}>
            HOSTED BY SRM ACM - SIGCHI
          </div>
          <p>GRIDLOCK 2026[Codeathon] - Live Leaderboard</p>
        </div>

        <div className="status-bar">
          <div className={`status-badge ${eventStatus === 'paused' ? 'paused' : eventStatus === 'active' ? 'active' : 'ended'}`}>
            <div className={`dot pulse ${eventStatus === 'paused' ? 'paused' : eventStatus === 'active' ? 'active' : 'ended'}`} />
            <span className={`status-text ${eventStatus === 'paused' ? 'paused' : eventStatus === 'active' ? 'active' : 'ended'}`}>
              {eventStatus === 'waiting' ? 'Waiting to Start' :
                eventStatus === 'active' ? 'Event Live' :
                  eventStatus === 'paused' ? 'Paused' : 'Event Ended'}
            </span>
          </div>

          <div className="connection-status">
            <div className={`dot ${connected ? 'pulse active' : 'disconnected'}`} />
            <span>{connected ? 'LIVE' : 'RECONNECTING...'}</span>
          </div>

          {lastUpdate && (
            <span className="last-update">
              Updated {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {eventStatus === 'waiting' ? (
        <div className="waiting-state">
          <div className="waiting-content">
            <div className="waiting-icon">⏳</div>
            <h2>Event Starting Soon</h2>
            <p>The leaderboard will appear when the codeathon begins</p>
          </div>
        </div>
      ) : eventStatus === 'ended' ? (
        <div className="ended-state">
          <div className="ended-header">
            <h2 className="ended-title"> GRIDLOCK [Codeathon] CONCLUDED </h2>
            <p className="ended-subtitle">Congratulations to the Final 9 Teams advancing to the next stage!</p>
          </div>

          <div className="ended-grid">
            {top9.map((team, i) => (
              <div
                key={team.code}
                className={`ended-card rank-${i + 1}`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="ended-rank">{MEDAL[i] || `#${i + 1}`}</div>
                <h3 className="ended-team-name">{team.name}</h3>
                <p className="ended-score">{team.questions_solved} Questions Solved</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="main-content">
          <div className="table-section" style={{ display: 'flex', flexDirection: 'row', gap: '2rem', flex: 1 }}>
            {columns.map((col, colIdx) => (
              <div key={colIdx} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="section-header" style={{ opacity: colIdx === 0 ? 1 : 0 }}>
                  <h2 className="section-title">⚡ Advancing — Top 9</h2>
                  <span className="team-count">{activeTeams.length} teams</span>
                </div>

                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px', textAlign: 'center' }}>Rank</th>
                      <th>Team</th>
                      <th style={{ textAlign: 'center' }}>Solved</th>
                      <th style={{ width: '120px' }}>Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {col.map((item) => {
                      if (item.isCutLine) {
                        return (
                          <tr key="cut-line" className="cut-line">
                            <td colSpan="4">
                              <div className="cut-line-wrapper">
                                <div className="cut-line-dash" />
                                <span className="cut-line-text">Phase Cutoff Zone!</span>
                                <div className="cut-line-dash" />
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      return <TeamRow key={item.code} team={item} rank={item.rank} isTop9={item.isTop9} />;
                    })}

                    {colIdx === 0 && displayItems.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                          No teams yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          <div className="right-panel">
            <div className="stats-card">
              <h3 className="card-title">Event Stats</h3>
              <div className="stats-list">
                <StatRow label="Total Teams" value={teams.length} />
                <StatRow label="Active" value={activeTeams.length} colorClass="color-green" />
                <StatRow label="Frozen" value={teams.filter(t => t.status === 'frozen').length} colorClass="color-red" />
                <StatRow label="Advancing" value={Math.min(9, activeTeams.length)} colorClass="color-accent" />
                <StatRow label="Disqualified" value={disqualified.length} colorClass="color-gray" />
              </div>
            </div>

            {displayItems.length > 0 && (
              <div className="leader-card">
                <p className="leader-title">🏆 Leading</p>
                <p className="leader-name">{displayItems[0].name}</p>
                <p className="leader-solved">{displayItems[0].questions_solved} questions solved</p>
              </div>
            )}

            {disqualified.length > 0 && (
              <div className="disqualified-card">
                <h3 className="card-title">Disqualified</h3>
                <div className="disqualified-list">
                  {disqualified.map(team => (
                    <div key={team.code} className="disqualified-item">
                      <span className="disqualified-name">{team.name}</span>
                      <span className="disqualified-solved">{team.questions_solved} solved</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="footer">
        <p>GRIDLOCK 2026[Codeathon]</p>
        <p style={{ fontFamily: 'monospace' }}>
          {new Date().toLocaleDateString()} — Updates every 10s
        </p>
      </div>
    </div>
  );
}

function TeamRow({ team, rank, isTop9 }) {
  const status = STATUS_CONFIG[team.status] || STATUS_CONFIG.active;
  const medal = MEDAL[rank - 1];

  return (
    <tr className={`slide-in ${isTop9 ? 'top' : 'not-top'}`}>
      <td className={`team-rank ${isTop9 ? 'top' : ''}`}>
        {medal ? <span className="medal">{medal}</span> : `#${rank}`}
      </td>

      <td>
        <div className="team-info">
          <p className="team-name">{team.name}</p>
          <div className="team-status">
            <div className={`team-status-dot ${status.dot}`} />
            <span className={status.color}>{status.label}</span>
          </div>
        </div>
      </td>

      <td className="team-solved-col">
        <p className="team-solved">{team.questions_solved}</p>
      </td>

      <td className="team-progress-col">
        <div className="progress-bar-container">
          <div
            className={`progress-bar ${!isTop9 ? 'not-top-bg' : ''}`}
            style={{ width: `${Math.min(100, (team.questions_solved / 8) * 100)}%` }}
          />
        </div>
        <p className="progress-text">{team.questions_solved}/8</p>
      </td>
    </tr>
  );
}

function StatRow({ label, value, colorClass = '' }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${colorClass}`}>{value}</span>
    </div>
  );
}