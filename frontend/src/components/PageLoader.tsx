/**
 * Page Loader Component
 */
import styles from './PageLoader.module.css'

export function PageLoader() {
  return (
    <div class={styles.pageLoading}>
      <div class={styles.spinner}></div>
      <p class={styles.message}>Loading...</p>
    </div>
  )
}
