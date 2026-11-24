import { ReleaseRoadmap } from "@/pages/ReleaseRoadmap/components/ReleaseRoadmap";

export function ReleaseRoadmapPanel({ releases }) {
  return (
    <div className="w-full">
      <ReleaseRoadmap releases={releases} />
    </div>
  );
}
