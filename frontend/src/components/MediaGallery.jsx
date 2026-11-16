import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export default function MediaGallery({ media = [], title }) {
  const [active, setActive] = useState(null);
  const files = media.filter((item) => item.url);
  if (!files.length) return <div className="gallery-empty"><span>Votre prochaine escale.</span></div>;
  const selected = active === null ? null : files[active];

  function move(direction) {
    setActive((current) => (current + direction + files.length) % files.length);
  }
  return <>
    <div className={`media-gallery gallery-count-${Math.min(files.length, 5)}`}>
      {files.slice(0, 5).map((item, index) => <button className={`gallery-tile gallery-tile-${index}`} key={item.id} onClick={() => setActive(index)} aria-label={`Agrandir le média ${index + 1}`}>
        {item.kind === "video" ? <video src={item.url} muted playsInline preload="metadata" /> : <img src={item.url} alt={item.alt_text || title} />}
        {item.kind === "video" && <span className="video-label">Vidéo</span>}
      </button>)}
      {files.length > 5 && <button className="gallery-more" onClick={() => setActive(0)}>Voir les {files.length} photos et vidéos</button>}
    </div>
    {selected && <div className="gallery-modal" role="dialog" aria-modal="true" aria-label="Galerie du logement" onClick={() => setActive(null)}>
      <button className="gallery-close" onClick={() => setActive(null)} aria-label="Fermer"><X /></button>
      <button className="gallery-prev" onClick={(event) => { event.stopPropagation(); move(-1); }} aria-label="Média précédent"><ChevronLeft /></button>
      <div className="gallery-modal-content" onClick={(event) => event.stopPropagation()}>
        {selected.kind === "video" ? <video src={selected.url} controls autoPlay /> : <img src={selected.url} alt={selected.alt_text || title} />}
        <span>{active + 1} / {files.length}</span>
      </div>
      <button className="gallery-next" onClick={(event) => { event.stopPropagation(); move(1); }} aria-label="Média suivant"><ChevronRight /></button>
    </div>}
  </>;
}
