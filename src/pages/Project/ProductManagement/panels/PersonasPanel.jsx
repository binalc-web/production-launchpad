import { ClientPersonaView } from "../personas/ClientPersonaView";
import { CompanyPersonaView } from "../personas/CompanyPersonaView";
import { CompetitorsPersonaView } from "../personas/CompetitorsPersonaView";
import { ProductPersonaView } from "../personas/ProductPersonaView";
import { ProfileUpdateOverlay } from "../components/ProfileUpdateOverlay";

const VIEWS = {
  client: ClientPersonaView,
  company: CompanyPersonaView,
  competitors: CompetitorsPersonaView,
  product: ProductPersonaView,
};

export function PersonasPanel({ activeProfile = "company" }) {
  const ActiveView = VIEWS[activeProfile] || CompanyPersonaView;

  return (
    <div className="w-full">
      <ProfileUpdateOverlay>
        <ActiveView />
      </ProfileUpdateOverlay>
    </div>
  );
}
