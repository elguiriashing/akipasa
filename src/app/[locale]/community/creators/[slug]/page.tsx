import { CommunityCreatorPage } from "@/components/community/CreatorProfilePage";
import styles from "../creator-public.module.css";

export const dynamic = "force-dynamic";

export default async function CreatorPage(
  props: Parameters<typeof CommunityCreatorPage>[0],
) {
  return <div className={styles.page}>{await CommunityCreatorPage(props)}</div>;
}
