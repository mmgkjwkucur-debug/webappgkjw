import Image from "next/image";

type LoadingScreenProps = {
  label?: string;
};

export default function LoadingScreen({ label = "Menyiapkan ruang GKJW" }: LoadingScreenProps) {
  return (
    <div className="loading-screen" role="status" aria-live="polite" aria-label={label}>
      <div className="loading-screen__halo" aria-hidden="true" />
      <div className="loading-screen__content">
        <div className="loading-screen__logo-wrap">
          <div className="loading-screen__ring" aria-hidden="true" />
          <div className="loading-screen__logo">
            <Image src="/icon.png" alt="GKJW" width={72} height={72} priority unoptimized />
          </div>
        </div>
        <p className="loading-screen__brand">GKJW Kucur</p>
        <p className="loading-screen__label">{label}</p>
        <div className="loading-screen__progress" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  );
}
