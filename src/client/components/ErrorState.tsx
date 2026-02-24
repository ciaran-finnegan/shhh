import MagneticButton from "./MagneticButton";

interface ErrorStateProps {
  message: string;
  onReset: () => void;
}

export default function ErrorState({ message, onReset }: ErrorStateProps) {
  return (
    <div className="animate-fade-up text-center space-y-6">
      <div className="text-6xl">&#128566;</div>
      <h2 className="font-serif italic text-2xl text-signal-red">{message}</h2>
      <MagneticButton variant="secondary" onClick={onReset}>
        Start over
      </MagneticButton>
    </div>
  );
}
