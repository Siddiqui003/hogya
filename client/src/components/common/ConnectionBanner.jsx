// import { useEffect, useState } from 'react';
// import useSocketStore from '../../store/socketStore';
// import styles from './ConnectionBanner.module.css';

// /**
//  * ConnectionBanner — slides down from the top when the socket connection
//  * is lost, and shows a brief "Reconnected" confirmation when it recovers.
//  *
//  * Avoids flashing on the very first connect (only shows after a *disconnect*
//  * has occurred at least once).
//  */
// const ConnectionBanner = () => {
//   const connected = useSocketStore((s) => s.connected);
//   const [everDisconnected, setEverDisconnected] = useState(false);
//   const [showReconnected, setShowReconnected] = useState(false);

//   useEffect(() => {
//     if (!connected) {
//       setEverDisconnected(true);
//       setShowReconnected(false);
//     } else if (everDisconnected) {
//       // Was disconnected, now back — show brief confirmation
//       setShowReconnected(true);
//       const t = setTimeout(() => setShowReconnected(false), 3000);
//       return () => clearTimeout(t);
//     }
//   }, [connected]); // eslint-disable-line react-hooks/exhaustive-deps

//   if (connected && !showReconnected) return null;

//   return (
//     <div className={[styles.banner, connected ? styles.success : styles.warning].join(' ')}>
//       {connected ? (
//         <>
//           <span className={styles.dot} />
//           Reconnected — your data is up to date
//         </>
//       ) : (
//         <>
//           <span className={styles.spinner} />
//           Connection lost — attempting to reconnect…
//         </>
//       )}
//     </div>
//   );
// };

// export default ConnectionBanner;

import { useEffect, useState } from 'react';
import useSocketStore from '../../store/socketStore';
import useAuthStore from '../../store/authStore';
import styles from './ConnectionBanner.module.css';

/**
 * ConnectionBanner — slides down from the top when the socket connection
 * is lost, and shows a brief "Reconnected" confirmation when it recovers.
 *
 * Avoids flashing on the very first connect (only shows after a *disconnect*
 * has occurred at least once), and stays hidden entirely when the user
 * isn't authenticated (no socket connection is expected on /login etc).
 */
const ConnectionBanner = () => {
  const connected = useSocketStore((s) => s.connected);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const [everDisconnected, setEverDisconnected] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    // Not logged in → no socket is expected; reset tracking and stay silent.
    if (!isAuthenticated) {
      setEverDisconnected(false);
      setShowReconnected(false);
      return;
    }

    if (!connected) {
      setEverDisconnected(true);
      setShowReconnected(false);
    } else if (everDisconnected) {
      // Was disconnected, now back — show brief confirmation
      setShowReconnected(true);
      const t = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(t);
    }
  }, [connected, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isAuthenticated) return null;
  if (connected && !showReconnected) return null;

  return (
    <div className={[styles.banner, connected ? styles.success : styles.warning].join(' ')}>
      {connected ? (
        <>
          <span className={styles.dot} />
          Reconnected — your data is up to date
        </>
      ) : (
        <>
          <span className={styles.spinner} />
          Connection lost — attempting to reconnect…
        </>
      )}
    </div>
  );
};

export default ConnectionBanner;