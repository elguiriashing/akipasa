import { CommunityCreatorPage } from "@/components/community/CreatorProfilePage";
import styles from "../creator-public.module.css";
import "@/components/community/public-creators-release.css";

export const dynamic = "force-dynamic";

export default async function CreatorPage(
  props: Parameters<typeof CommunityCreatorPage>[0],
) {
  return (
    <div className={`${styles.page} public-creators-release`}>
      {await CommunityCreatorPage(props)}
    </div>
  );
}
