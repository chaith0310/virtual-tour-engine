import {
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import {
  getAllViewpoints,
  validateTour,
  type TourData,
} from "../data/tour";

import { isIndexedDbAsset } from "../data/assetStore";

type PublishManagerProps = {
  tour: TourData;
  onClose: () => void;
};

type PublishManifest = {
  manifestVersion: "1.0.0";
  publishedAt: string;
  viewerMode: true;
  packageType: "CLIENT_MANIFEST";
  tour: TourData;
  statistics: {
    spaces: number;
    viewpoints: number;
    hotspots: number;
    navigationHotspots: number;
    contentHotspots: number;
  };
};

export default function PublishManager({
  tour,
  onClose,
}: PublishManagerProps) {
  const [publishedAt, setPublishedAt] =
    useState<string | null>(null);

  const [copied, setCopied] =
    useState(false);

  const validation = useMemo(
    () => validateTour(tour),
    [tour],
  );

  const viewpoints = useMemo(
    () => getAllViewpoints(tour),
    [tour],
  );

  const statistics = useMemo(() => {
    const navigationHotspots =
      tour.hotspots.filter(
        (hotspot) =>
          hotspot.enabled &&
          (hotspot.type ===
            "SPACE_NAVIGATION" ||
            hotspot.type ===
              "VIEWPOINT_NAVIGATION"),
      ).length;

    const enabledHotspots =
      tour.hotspots.filter(
        (hotspot) => hotspot.enabled,
      );

    return {
      spaces: tour.spaces.filter(
        (space) => space.enabled,
      ).length,

      viewpoints: viewpoints.filter(
        (viewpoint) =>
          viewpoint.enabled,
      ).length,

      hotspots:
        enabledHotspots.length,

      navigationHotspots,

      contentHotspots:
        enabledHotspots.length -
        navigationHotspots,
    };
  }, [tour, viewpoints]);

  const indexedDbViewpoints =
    useMemo(
      () =>
        viewpoints.filter(
          (viewpoint) =>
            isIndexedDbAsset(
              viewpoint.panorama,
            ),
        ),
      [viewpoints],
    );

  const canPublish =
    validation.errors.length === 0;

  const isPortable =
    indexedDbViewpoints.length === 0;

  const createManifest =
    (): PublishManifest => {
      const timestamp =
        new Date().toISOString();

      return {
        manifestVersion: "1.0.0",
        publishedAt: timestamp,
        viewerMode: true,
        packageType:
          "CLIENT_MANIFEST",

        tour: {
          ...tour,
          updatedAt: timestamp,
        },

        statistics,
      };
    };

  const downloadManifest = () => {
    if (!canPublish) {
      window.alert(
        "Fix the validation errors before publishing.",
      );

      return;
    }

    const manifest =
      createManifest();

    const content = JSON.stringify(
      manifest,
      null,
      2,
    );

    const blob = new Blob(
      [content],
      {
        type: "application/json",
      },
    );

    const objectUrl =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement("a");

    anchor.href = objectUrl;
    anchor.download = `${createSafeFileName(
      tour.title,
    )}-published.json`;

    document.body.appendChild(
      anchor,
    );

    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(
      objectUrl,
    );

    setPublishedAt(
      manifest.publishedAt,
    );
  };

  const copyManifest = async () => {
    if (!canPublish) {
      window.alert(
        "Fix the validation errors before copying the publish manifest.",
      );

      return;
    }

    const manifest =
      createManifest();

    try {
      await navigator.clipboard.writeText(
        JSON.stringify(
          manifest,
          null,
          2,
        ),
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch (error) {
      console.error(error);

      window.alert(
        "The browser could not copy the manifest. Use Download Manifest instead.",
      );
    }
  };

  return (
    <div style={overlayStyle}>
      <section style={panelStyle}>
        <header style={headerStyle}>
          <div>
            <p style={eyebrowStyle}>
              PUBLISH PACKAGE
            </p>

            <h2 style={titleStyle}>
              {tour.title}
            </h2>

            <p style={subtitleStyle}>
              Validate the tour and create
              a read-only client manifest.
            </p>
          </div>

          <button
            type="button"
            style={closeButtonStyle}
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <div style={statusCardStyle}>
          <div>
            <span style={statusLabelStyle}>
              Publish status
            </span>

            <strong
              style={
                canPublish
                  ? readyStatusStyle
                  : blockedStatusStyle
              }
            >
              {canPublish
                ? "Ready to publish"
                : "Publishing blocked"}
            </strong>
          </div>

          <div
            style={
              canPublish
                ? readyBadgeStyle
                : blockedBadgeStyle
            }
          >
            {canPublish ? "READY" : "FIX"}
          </div>
        </div>

        <div style={statsGridStyle}>
          <StatCard
            label="Spaces"
            value={statistics.spaces}
          />

          <StatCard
            label="Viewpoints"
            value={statistics.viewpoints}
          />

          <StatCard
            label="Hotspots"
            value={statistics.hotspots}
          />

          <StatCard
            label="Navigation"
            value={
              statistics.navigationHotspots
            }
          />

          <StatCard
            label="Content"
            value={
              statistics.contentHotspots
            }
          />
        </div>

        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <h3 style={sectionTitleStyle}>
              Validation
            </h3>

            <span style={mutedStyle}>
              {validation.errors.length}
              {" error(s), "}
              {validation.warnings.length}
              {" warning(s)"}
            </span>
          </div>

          {validation.errors.length ===
            0 &&
            validation.warnings.length ===
              0 && (
              <p style={successMessageStyle}>
                No validation issues were
                found.
              </p>
            )}

          {validation.errors.map(
            (error) => (
              <div
                key={error}
                style={errorItemStyle}
              >
                <span>ERROR</span>
                <p>{error}</p>
              </div>
            ),
          )}

          {validation.warnings.map(
            (warning) => (
              <div
                key={warning}
                style={warningItemStyle}
              >
                <span>WARN</span>
                <p>{warning}</p>
              </div>
            ),
          )}
        </section>

        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <h3 style={sectionTitleStyle}>
              Asset portability
            </h3>

            <span
              style={
                isPortable
                  ? portableLabelStyle
                  : localLabelStyle
              }
            >
              {isPortable
                ? "PORTABLE"
                : "LOCAL ASSETS"}
            </span>
          </div>

          {isPortable ? (
            <p style={bodyTextStyle}>
              All panorama references are
              regular URLs or bundled asset
              URLs.
            </p>
          ) : (
            <>
              <p style={bodyTextStyle}>
                This manifest contains
                IndexedDB panorama references.
                The JSON can be reopened in
                this browser, but the images
                are not included in the
                downloaded file.
              </p>

              <ul style={assetListStyle}>
                {indexedDbViewpoints.map(
                  (viewpoint) => (
                    <li key={viewpoint.id}>
                      {viewpoint.title}
                    </li>
                  ),
                )}
              </ul>
            </>
          )}
        </section>

        <section style={sectionStyle}>
          <h3 style={sectionTitleStyle}>
            Package metadata
          </h3>

          <dl style={metadataGridStyle}>
            <MetadataItem
              label="Manifest version"
              value="1.0.0"
            />

            <MetadataItem
              label="Viewer mode"
              value="Read only"
            />

            <MetadataItem
              label="Tour ID"
              value={tour.id}
            />

            <MetadataItem
              label="Start viewpoint"
              value={
                tour.startViewpointId
              }
            />

            <MetadataItem
              label="Last draft update"
              value={formatDate(
                tour.updatedAt,
              )}
            />

            {publishedAt && (
              <MetadataItem
                label="Last package created"
                value={formatDate(
                  publishedAt,
                )}
              />
            )}
          </dl>
        </section>

        <div style={noteStyle}>
          <strong>
            Current package scope
          </strong>

          <p>
            This feature downloads the
            publish manifest only. A later
            standalone-viewer feature will
            load this manifest in customer
            mode. A later backend/CDN feature
            will make uploaded IndexedDB
            images portable across devices.
          </p>
        </div>

        <footer style={actionsStyle}>
          <button
            type="button"
            style={secondaryButtonStyle}
            disabled={!canPublish}
            onClick={() =>
              void copyManifest()
            }
          >
            {copied
              ? "Copied"
              : "Copy Manifest"}
          </button>

          <button
            type="button"
            style={
              canPublish
                ? publishButtonStyle
                : disabledButtonStyle
            }
            disabled={!canPublish}
            onClick={downloadManifest}
          >
            Download Publish Manifest
          </button>
        </footer>
      </section>
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: number;
};

function StatCard({
  label,
  value,
}: StatCardProps) {
  return (
    <div style={statCardStyle}>
      <strong style={statValueStyle}>
        {value}
      </strong>

      <span style={statLabelStyle}>
        {label}
      </span>
    </div>
  );
}

type MetadataItemProps = {
  label: string;
  value: string;
};

function MetadataItem({
  label,
  value,
}: MetadataItemProps) {
  return (
    <div style={metadataItemStyle}>
      <dt style={metadataLabelStyle}>
        {label}
      </dt>

      <dd style={metadataValueStyle}>
        {value}
      </dd>
    </div>
  );
}

function createSafeFileName(
  value: string,
): string {
  const safeName = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return safeName || "virtual-tour";
}

function formatDate(
  value: string,
): string {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return value;
  }

  return date.toLocaleString();
}

const overlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 4500,
  display: "flex",
  justifyContent: "flex-end",
  background: "rgba(2, 6, 23, 0.74)",
};

const panelStyle: CSSProperties = {
  width: "100%",
  maxWidth: 640,
  height: "100%",
  padding: 26,
  boxSizing: "border-box",
  overflowY: "auto",
  background: "#f8fafc",
  boxShadow:
    "-26px 0 80px rgba(0,0,0,0.32)",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 18,
};

const eyebrowStyle: CSSProperties = {
  margin: "0 0 6px",
  color: "#2563eb",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.12em",
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 25,
};

const subtitleStyle: CSSProperties = {
  marginTop: 7,
  color: "#64748b",
  lineHeight: 1.5,
};

const closeButtonStyle: CSSProperties = {
  padding: "9px 13px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  color: "#334155",
  background: "#ffffff",
  cursor: "pointer",
};

const statusCardStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 18,
  marginTop: 24,
  padding: 18,
  border: "1px solid #e2e8f0",
  borderRadius: 13,
  background: "#ffffff",
};

const statusLabelStyle: CSSProperties = {
  display: "block",
  marginBottom: 4,
  color: "#64748b",
  fontSize: 12,
};

const readyStatusStyle: CSSProperties = {
  color: "#047857",
  fontSize: 17,
};

const blockedStatusStyle: CSSProperties = {
  color: "#b91c1c",
  fontSize: 17,
};

const readyBadgeStyle: CSSProperties = {
  padding: "7px 10px",
  borderRadius: 999,
  color: "#047857",
  background: "#d1fae5",
  fontSize: 11,
  fontWeight: 800,
};

const blockedBadgeStyle: CSSProperties = {
  padding: "7px 10px",
  borderRadius: 999,
  color: "#b91c1c",
  background: "#fee2e2",
  fontSize: 11,
  fontWeight: 800,
};

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(96px, 1fr))",
  gap: 9,
  marginTop: 14,
};

const statCardStyle: CSSProperties = {
  padding: 13,
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  textAlign: "center",
  background: "#ffffff",
};

const statValueStyle: CSSProperties = {
  display: "block",
  color: "#0f172a",
  fontSize: 22,
};

const statLabelStyle: CSSProperties = {
  display: "block",
  marginTop: 3,
  color: "#64748b",
  fontSize: 11,
};

const sectionStyle: CSSProperties = {
  marginTop: 15,
  padding: 18,
  border: "1px solid #e2e8f0",
  borderRadius: 13,
  background: "#ffffff",
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 12,
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  color: "#334155",
  fontSize: 15,
};

const mutedStyle: CSSProperties = {
  color: "#64748b",
  fontSize: 11,
};

const successMessageStyle: CSSProperties = {
  marginBottom: 0,
  color: "#047857",
  fontSize: 13,
};

const errorItemStyle: CSSProperties = {
  marginTop: 8,
  padding: 10,
  border: "1px solid #fecaca",
  borderRadius: 8,
  color: "#991b1b",
  background: "#fef2f2",
  fontSize: 12,
};

const warningItemStyle: CSSProperties = {
  marginTop: 8,
  padding: 10,
  border: "1px solid #fde68a",
  borderRadius: 8,
  color: "#92400e",
  background: "#fffbeb",
  fontSize: 12,
};

const bodyTextStyle: CSSProperties = {
  marginBottom: 0,
  color: "#475569",
  fontSize: 13,
  lineHeight: 1.6,
};

const portableLabelStyle: CSSProperties = {
  padding: "5px 8px",
  borderRadius: 999,
  color: "#047857",
  background: "#d1fae5",
  fontSize: 10,
  fontWeight: 800,
};

const localLabelStyle: CSSProperties = {
  padding: "5px 8px",
  borderRadius: 999,
  color: "#92400e",
  background: "#fef3c7",
  fontSize: 10,
  fontWeight: 800,
};

const assetListStyle: CSSProperties = {
  marginBottom: 0,
  paddingLeft: 20,
  color: "#7c2d12",
  fontSize: 12,
};

const metadataGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 10,
  marginBottom: 0,
};

const metadataItemStyle: CSSProperties = {
  padding: 10,
  borderRadius: 8,
  background: "#f8fafc",
};

const metadataLabelStyle: CSSProperties = {
  color: "#64748b",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const metadataValueStyle: CSSProperties = {
  margin: "4px 0 0",
  color: "#0f172a",
  fontSize: 12,
  overflowWrap: "anywhere",
};

const noteStyle: CSSProperties = {
  marginTop: 15,
  padding: 14,
  border: "1px solid #bfdbfe",
  borderRadius: 11,
  color: "#1e3a8a",
  background: "#eff6ff",
  fontSize: 12,
  lineHeight: 1.6,
};

const actionsStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  flexWrap: "wrap",
  gap: 9,
  marginTop: 18,
};

const secondaryButtonStyle: CSSProperties = {
  padding: "10px 14px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  color: "#334155",
  background: "#ffffff",
  cursor: "pointer",
};

const publishButtonStyle: CSSProperties = {
  padding: "10px 14px",
  border: "none",
  borderRadius: 8,
  color: "#ffffff",
  background: "#059669",
  fontWeight: 750,
  cursor: "pointer",
};

const disabledButtonStyle: CSSProperties = {
  ...publishButtonStyle,
  color: "#94a3b8",
  background: "#e2e8f0",
  cursor: "not-allowed",
};