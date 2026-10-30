import { CreatorDirectoryPage } from "@/components/community/CreatorDirectoryPage";
import styles from "./creator-public.module.css";

export default async function CreatorsPage(
  props: Parameters<typeof CreatorDirectoryPage>[0],
) {
  return <div className={styles.page}>{await CreatorDirectoryPage(props)}</div>;
}
