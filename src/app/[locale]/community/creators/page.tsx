import { CreatorDirectoryPage } from "@/components/community/CreatorDirectoryPage";
import styles from "./creator-public.module.css";
import "@/components/community/public-creators-release.css";

export default async function CreatorsPage(
  props: Parameters<typeof CreatorDirectoryPage>[0],
) {
  return (
    <div className={`${styles.page} public-creators-release`}>
      {await CreatorDirectoryPage(props)}
    </div>
  );
}
