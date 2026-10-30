import { CreatorDirectoryPage } from "@/components/community/CreatorDirectoryPage";
import "@/components/community/public-creators-release.css";

export default function PublicCreatorsPage(
  props: Parameters<typeof CreatorDirectoryPage>[0],
) {
  return (
    <div className="public-creators-release">
      <CreatorDirectoryPage {...props} />
    </div>
  );
}
