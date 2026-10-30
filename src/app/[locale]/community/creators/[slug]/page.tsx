import { CommunityCreatorPage } from "@/components/community/CreatorProfilePage";
import "@/components/community/public-creators-release.css";
export { dynamic } from "@/components/community/CreatorProfilePage";

export default function PublicCreatorPage(
  props: Parameters<typeof CommunityCreatorPage>[0],
) {
  return (
    <div className="public-creators-release">
      <CommunityCreatorPage {...props} />
    </div>
  );
}
