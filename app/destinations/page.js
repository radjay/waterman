import { MainLayout } from "../../components/layout/MainLayout";
import { PageHeader } from "../../components/layout/PageHeader";
import { RatingMatrix } from "../../components/ui/RatingMatrix";
import { MONTHS, WINGFOIL_DESTINATIONS } from "../../lib/data/wingfoilDestinations";

export const metadata = {
    title: "Waterman - Wingfoil Destinations",
    description: "Year-round wingfoil destination guide from Lisbon: wind reliability by month, travel time, and water temperature.",
};

export default function DestinationsPage() {
    return (
        <MainLayout>
            <PageHeader
                title="Wingfoil Destinations"
                subtitle="21 spots, wind reliability by month, sorted by travel time from Lisbon. Tap a rating for detail."
            />
            <div className="pb-16">
                <RatingMatrix rows={WINGFOIL_DESTINATIONS} months={MONTHS} />
            </div>
        </MainLayout>
    );
}
