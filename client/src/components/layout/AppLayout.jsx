import Navbar from './Navbar';
import styles from './AppLayout.module.css';

const AppLayout = ({ children }) => (
  <div className={styles.layout}>
    <Navbar />
    <main className={styles.main}>
      <div className={styles.container}>{children}</div>
    </main>
  </div>
);

export default AppLayout;
