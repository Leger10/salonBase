// /src/components/CoverCube.jsx
import React from "react";

const SIZE = 240;
const MAX_FACES = 6;

/**
 * Section d'accueil dédiée aux couvertures, sans texte superposé.
 * Les images sont réparties sur les faces d'un cube qui tourne (4 faces = cube,
 * davantage = prisme) et l'animation se met en pause au survol.
 */
export default function CoverCube({ images = [], title, subtitle }) {
  const urls = Array.isArray(images)
    ? images.filter((url) => typeof url === "string" && url.trim()).slice(0, MAX_FACES)
    : [];

  if (urls.length === 0) return null;

  const count = urls.length;
  const radius = count === 1
    ? 0
    : count === 2
      ? SIZE / 2
      : (SIZE / 2) / Math.tan(Math.PI / count);

  return (
    <section className="py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight">
            {title || "Nos couvertures"}
          </h2>
          {subtitle && (
            <p className="text-muted-foreground mt-2">{subtitle}</p>
          )}
        </div>

        <div
          className="cover-cube-scene mx-auto flex items-center justify-center"
          style={{ height: SIZE + 80 }}
        >
          <div
            className="cover-cube"
            style={{ width: SIZE, height: SIZE }}
          >
            {urls.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="cover-cube-face"
                style={{
                  transform: `rotateY(${(index * 360) / count}deg) translateZ(${radius}px)`,
                }}
              >
                <img src={url} alt={`Couverture ${index + 1}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
