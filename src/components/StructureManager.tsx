import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import {
  deletePanoramaAsset,
  resolvePanoramaUrl,
  savePanoramaAsset,
} from "../data/assetStore";

import { validatePanoramaFile } from "../utils/panoramaValidation";

import type {
  Space,
  TourData,
  Viewpoint,
  ViewpointRole,
} from "../data/tour";

type StructureManagerProps = {
  tour: TourData;
  currentViewpointId: string;
  onTourChange: (updatedTour: TourData) => void;
  onNavigate: (viewpointId: string) => Promise<void>;
  onClose: () => void;
};

type NewSpaceForm = {
  title: string;
  type: Space["type"];
};

type NewViewpointForm = {
  title: string;
  role: ViewpointRole;
  spaceId: string;
  file: File | null;
};

const emptySpaceForm: NewSpaceForm = {
  title: "",
  type: "OTHER",
};

export default function StructureManager({
  tour,
  currentViewpointId,
  onTourChange,
  onNavigate,
  onClose,
}: StructureManagerProps) {
  const [activeTab, setActiveTab] =
    useState<"spaces" | "viewpoints">("spaces");

  const [spaceForm, setSpaceForm] =
    useState<NewSpaceForm>(emptySpaceForm);

  const firstSpaceId =
  tour.spaces[0]?.id ?? "";

const [viewpointForm, setViewpointForm] =
  useState<NewViewpointForm>({
    title: "",
    role: "CENTER",
    spaceId: firstSpaceId,
    file: null,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const sortedSpaces = useMemo(
    () =>
      [...tour.spaces].sort(
        (first, second) =>
          first.displayOrder - second.displayOrder,
      ),
    [tour.spaces],
  );

 

   

  const addSpace = () => {
    const title = spaceForm.title.trim();

    if (!title) {
      setMessage("Enter a Space title.");
      return;
    }

    const newSpace: Space = {
      id: createSlugId(title),
      title,
      type: spaceForm.type,
      displayOrder: tour.spaces.length + 1,
      enabled: true,
      viewpoints: [],
    };

    const updatedTour: TourData = {
      ...tour,
      spaces: [...tour.spaces, newSpace],
      updatedAt: new Date().toISOString(),
    };

    onTourChange(updatedTour);

    setViewpointForm((current) => ({
      ...current,
      spaceId: newSpace.id,
      role: "CENTER",
    }));

    setSpaceForm(emptySpaceForm);
    setActiveTab("viewpoints");
    setMessage(
      `${title} created. Add the required Center viewpoint now.`,
    );
  };

  const addViewpoint = async () => {
    const title = viewpointForm.title.trim();

    if (!title) {
      setMessage("Enter a viewpoint title.");
      return;
    }

    if (!viewpointForm.spaceId) {
      setMessage("Choose a Space.");
      return;
    }

    if (!viewpointForm.file) {
      setMessage("Choose a panorama image.");
      return;
    }

    const selectedSpace = tour.spaces.find(
      (space) => space.id === viewpointForm.spaceId,
    );

    if (!selectedSpace) {
      setMessage("The selected Space no longer exists.");
      return;
    }

    if (
      viewpointForm.role === "CENTER" &&
      selectedSpace.viewpoints.some(
        (viewpoint) =>
          viewpoint.enabled && viewpoint.role === "CENTER",
      )
    ) {
      setMessage(
        `${selectedSpace.title} already has a Center viewpoint.`,
      );
      return;
    }

    setIsSaving(true);
    setMessage("Checking panorama...");

    try {
      const validation = await validatePanoramaFile(
        viewpointForm.file,
      );

      if (!validation.valid) {
        setMessage(validation.message ?? "Invalid panorama.");
        return;
      }

      setMessage("Saving panorama...");

      const panoramaReference = await savePanoramaAsset(
        viewpointForm.file,
      );

      const newViewpoint: Viewpoint = {
        id: createSlugId(title),
        spaceId: selectedSpace.id,
        title,
        role: viewpointForm.role,
        panorama: panoramaReference,
        initialYaw: 0,
        initialPitch: 0,
        initialZoom: 35,
        displayOrder: selectedSpace.viewpoints.length + 1,
        enabled: true,
      };

      const updatedTour: TourData = {
        ...tour,
        spaces: tour.spaces.map((space) =>
          space.id === selectedSpace.id
            ? {
                ...space,
                viewpoints: [
                  ...space.viewpoints,
                  newViewpoint,
                ],
              }
            : space,
        ),
        updatedAt: new Date().toISOString(),
      };

      onTourChange(updatedTour);

      setViewpointForm({
        title: "",
        role: "CUSTOM",
        spaceId: selectedSpace.id,
        file: null,
      });

      setMessage(`${title} added successfully.`);
      await onNavigate(newViewpoint.id);
    } catch (error) {
      console.error(error);
      setMessage("The panorama could not be saved.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteViewpoint = async (
    space: Space,
    viewpoint: Viewpoint,
  ) => {
    const isUsedByHotspot = tour.hotspots.some(
      (hotspot) =>
        hotspot.sourceViewpointId === viewpoint.id ||
        hotspot.targetViewpointId === viewpoint.id,
    );

    if (isUsedByHotspot) {
      setMessage(
        "Delete or redirect the hotspots connected to this viewpoint first.",
      );
      return;
    }

    if (viewpoint.id === tour.startViewpointId) {
      setMessage(
        "Choose another start viewpoint before deleting this one.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete ${viewpoint.title}?`,
    );

    if (!confirmed) {
      return;
    }

    await deletePanoramaAsset(viewpoint.panorama);

    const updatedTour: TourData = {
      ...tour,
      spaces: tour.spaces.map((candidateSpace) =>
        candidateSpace.id === space.id
          ? {
              ...candidateSpace,
              viewpoints: candidateSpace.viewpoints.filter(
                (candidateViewpoint) =>
                  candidateViewpoint.id !== viewpoint.id,
              ),
            }
          : candidateSpace,
      ),
      updatedAt: new Date().toISOString(),
    };

    onTourChange(updatedTour);
    setMessage(`${viewpoint.title} deleted.`);
  };

  const deleteSpace = async (space: Space) => {
    if (
      space.viewpoints.some(
        (viewpoint) => viewpoint.id === tour.startViewpointId,
      )
    ) {
      setMessage(
        "The Space contains the starting viewpoint. Change the starting viewpoint first.",
      );
      return;
    }

    const usedViewpointIds = new Set(
      space.viewpoints.map((viewpoint) => viewpoint.id),
    );

    const hasConnectedHotspots = tour.hotspots.some(
      (hotspot) =>
        usedViewpointIds.has(hotspot.sourceViewpointId) ||
        Boolean(
          hotspot.targetViewpointId &&
            usedViewpointIds.has(hotspot.targetViewpointId),
        ),
    );

    if (hasConnectedHotspots) {
      setMessage(
        "Delete or redirect hotspots connected to this Space first.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete ${space.title} and all its panoramas?`,
    );

    if (!confirmed) {
      return;
    }

    await Promise.all(
      space.viewpoints.map((viewpoint) =>
        deletePanoramaAsset(viewpoint.panorama),
      ),
    );

    const updatedTour: TourData = {
      ...tour,
      spaces: tour.spaces.filter(
        (candidateSpace) => candidateSpace.id !== space.id,
      ),
      updatedAt: new Date().toISOString(),
    };

    onTourChange(updatedTour);
    setMessage(`${space.title} deleted.`);
  };

  const setStartViewpoint = (viewpointId: string) => {
    onTourChange({
      ...tour,
      startViewpointId: viewpointId,
      updatedAt: new Date().toISOString(),
    });

    setMessage("Starting viewpoint updated.");
  };

  return (
    <div style={overlayStyle}>
      <section style={panelStyle}>
        <header style={headerStyle}>
          <div>
            <h2 style={titleStyle}>Tour Structure</h2>
            <p style={subtitleStyle}>
              Add Spaces and panorama viewpoints without editing
              code.
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

        <div style={tabsStyle}>
          <button
            type="button"
            style={
              activeTab === "spaces" ? activeTabStyle : tabStyle
            }
            onClick={() => setActiveTab("spaces")}
          >
            Spaces
          </button>

          <button
            type="button"
            style={
              activeTab === "viewpoints"
                ? activeTabStyle
                : tabStyle
            }
            onClick={() => setActiveTab("viewpoints")}
          >
            Viewpoints
          </button>
        </div>

        {message && <div style={messageStyle}>{message}</div>}

        {activeTab === "spaces" && (
          <>
            <div style={formCardStyle}>
              <h3 style={sectionTitleStyle}>Add Space</h3>

              <label style={labelStyle}>Space title</label>
              <input
                style={inputStyle}
                value={spaceForm.title}
                placeholder="Example: Master Bedroom"
                onChange={(event) =>
                  setSpaceForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />

              <label style={labelStyle}>Space type</label>
              <select
                style={inputStyle}
                value={spaceForm.type}
                onChange={(event) =>
                  setSpaceForm((current) => ({
                    ...current,
                    type: event.target.value as Space["type"],
                  }))
                }
              >
                <option value="EXTERIOR">Exterior</option>
                <option value="ENTRANCE">Entrance</option>
                <option value="HALL">Hall</option>
                <option value="KITCHEN">Kitchen</option>
                <option value="BEDROOM">Bedroom</option>
                <option value="BATHROOM">Bathroom</option>
                <option value="CORRIDOR">Corridor</option>
                <option value="BALCONY">Balcony</option>
                <option value="GARDEN">Garden</option>
                <option value="TERRACE">Terrace</option>
                <option value="OTHER">Other</option>
              </select>

              <button
                type="button"
                style={primaryButtonStyle}
                onClick={addSpace}
              >
                Add Space
              </button>
            </div>

            <div style={listStyle}>
              {sortedSpaces.map((space) => (
                <article key={space.id} style={itemStyle}>
                  <div>
                    <strong>{space.title}</strong>
                    <small style={mutedTextStyle}>
                      {space.type} · {space.viewpoints.length}{" "}
                      viewpoint(s)
                    </small>
                  </div>

                  <div style={itemActionsStyle}>
                    <button
                      type="button"
                      style={secondaryButtonStyle}
                      onClick={() => {
                        setViewpointForm((current) => ({
                          ...current,
                          spaceId: space.id,
                          role:
                            space.viewpoints.length === 0
                              ? "CENTER"
                              : "CUSTOM",
                        }));
                        setActiveTab("viewpoints");
                      }}
                    >
                      Add View
                    </button>

                    <button
                      type="button"
                      style={dangerButtonStyle}
                      onClick={() => void deleteSpace(space)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {activeTab === "viewpoints" && (
          <>
            <div style={formCardStyle}>
              <h3 style={sectionTitleStyle}>Add Viewpoint</h3>

              <label style={labelStyle}>Space</label>
              <select
                style={inputStyle}
                value={viewpointForm.spaceId}
                onChange={(event) =>
                  setViewpointForm((current) => ({
                    ...current,
                    spaceId: event.target.value,
                  }))
                }
              >
                {sortedSpaces.map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.title}
                  </option>
                ))}
              </select>

              <label style={labelStyle}>Viewpoint title</label>
              <input
                style={inputStyle}
                value={viewpointForm.title}
                placeholder="Example: Bedroom Center"
                onChange={(event) =>
                  setViewpointForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />

              <label style={labelStyle}>Viewpoint role</label>
              <select
                style={inputStyle}
                value={viewpointForm.role}
                onChange={(event) =>
                  setViewpointForm((current) => ({
                    ...current,
                    role: event.target.value as ViewpointRole,
                  }))
                }
              >
                <option value="CENTER">Center</option>
                <option value="APPROACH">Approach</option>
                <option value="FEATURE">Feature / View</option>
                <option value="CUSTOM">Custom</option>
              </select>

              <label style={labelStyle}>Panorama image</label>
              <input
                type="file"
                accept="image/jpeg,image/png"
                style={inputStyle}
                onChange={(event) =>
                  setViewpointForm((current) => ({
                    ...current,
                    file: event.target.files?.[0] ?? null,
                  }))
                }
              />

              {viewpointForm.file && (
                <small style={selectedFileStyle}>
                  {viewpointForm.file.name} ·{" "}
                  {formatBytes(viewpointForm.file.size)}
                </small>
              )}

              <button
                type="button"
                style={primaryButtonStyle}
                disabled={isSaving}
                onClick={() => void addViewpoint()}
              >
                {isSaving ? "Saving..." : "Add Viewpoint"}
              </button>
            </div>

            <div style={listStyle}>
              {sortedSpaces.map((space) => (
                <section key={space.id} style={viewpointGroupStyle}>
                  <h3 style={sectionTitleStyle}>{space.title}</h3>

                  {space.viewpoints.length === 0 && (
                    <p style={warningTextStyle}>
                      A Center viewpoint is required.
                    </p>
                  )}

                  {[...space.viewpoints]
                    .sort(
                      (first, second) =>
                        first.displayOrder - second.displayOrder,
                    )
                    .map((viewpoint) => (
                      <ViewpointItem
                        key={viewpoint.id}
                        viewpoint={viewpoint}
                        space={space}
                        isCurrent={
                          viewpoint.id === currentViewpointId
                        }
                        isStart={
                          viewpoint.id === tour.startViewpointId
                        }
                        onNavigate={onNavigate}
                        onSetStart={setStartViewpoint}
                        onDelete={deleteViewpoint}
                      />
                    ))}
                </section>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

type ViewpointItemProps = {
  viewpoint: Viewpoint;
  space: Space;
  isCurrent: boolean;
  isStart: boolean;
  onNavigate: (viewpointId: string) => Promise<void>;
  onSetStart: (viewpointId: string) => void;
  onDelete: (
    space: Space,
    viewpoint: Viewpoint,
  ) => Promise<void>;
};

function ViewpointItem({
  viewpoint,
  space,
  isCurrent,
  isStart,
  onNavigate,
  onSetStart,
  onDelete,
}: ViewpointItemProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState("");

  useEffect(() => {
    let active = true;

    void resolvePanoramaUrl(viewpoint.panorama)
      .then((url) => {
        if (active) {
          setThumbnailUrl(url);
        }
      })
      .catch(console.error);

    return () => {
      active = false;
    };
  }, [viewpoint.panorama]);

  return (
    <article
      style={isCurrent ? activeViewpointItemStyle : itemStyle}
    >
      <div style={thumbnailRowStyle}>
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt={`${viewpoint.title} thumbnail`}
            style={thumbnailStyle}
          />
        )}

        <div>
          <strong>{viewpoint.title}</strong>
          <small style={mutedTextStyle}>
            {viewpoint.role}
            {isStart ? " · START" : ""}
          </small>
        </div>
      </div>

      <div style={itemActionsStyle}>
        <button
          type="button"
          style={secondaryButtonStyle}
          onClick={() => void onNavigate(viewpoint.id)}
        >
          Open
        </button>

        {!isStart && (
          <button
            type="button"
            style={secondaryButtonStyle}
            onClick={() => onSetStart(viewpoint.id)}
          >
            Set Start
          </button>
        )}

        <button
          type="button"
          style={dangerButtonStyle}
          onClick={() => void onDelete(space, viewpoint)}
        >
          Delete
        </button>
      </div>
    </article>
  );
}

function createSlugId(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || "item"}-${crypto.randomUUID().slice(0, 8)}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const megabytes = bytes / 1024 / 1024;
  return `${megabytes.toFixed(1)} MB`;
}

const overlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 4000,
  display: "flex",
  justifyContent: "flex-end",
  background: "rgba(2, 6, 23, 0.72)",
};

const panelStyle: CSSProperties = {
  width: "100%",
  maxWidth: 620,
  height: "100%",
  padding: 24,
  boxSizing: "border-box",
  overflowY: "auto",
  background: "#f8fafc",
  boxShadow: "-24px 0 70px rgba(0,0,0,0.30)",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 20,
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
};

const subtitleStyle: CSSProperties = {
  marginTop: 5,
  color: "#64748b",
  fontSize: 14,
};

const closeButtonStyle: CSSProperties = {
  height: 36,
  padding: "0 13px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  background: "#ffffff",
  cursor: "pointer",
};

const tabsStyle: CSSProperties = {
  display: "flex",
  gap: 6,
  marginTop: 20,
  marginBottom: 16,
  padding: 5,
  borderRadius: 10,
  background: "#e2e8f0",
};

const tabStyle: CSSProperties = {
  flex: 1,
  padding: 9,
  border: "none",
  borderRadius: 7,
  color: "#475569",
  background: "transparent",
  cursor: "pointer",
};

const activeTabStyle: CSSProperties = {
  ...tabStyle,
  color: "#ffffff",
  background: "#2563eb",
};

const messageStyle: CSSProperties = {
  marginBottom: 15,
  padding: 11,
  border: "1px solid #bfdbfe",
  borderRadius: 8,
  color: "#1d4ed8",
  background: "#eff6ff",
  fontSize: 13,
};

const formCardStyle: CSSProperties = {
  padding: 17,
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  background: "#ffffff",
};

const sectionTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 10,
  color: "#334155",
  fontSize: 15,
};

const labelStyle: CSSProperties = {
  display: "block",
  marginTop: 12,
  marginBottom: 5,
  color: "#334155",
  fontSize: 13,
  fontWeight: 650,
};

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 11px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  color: "#0f172a",
  background: "#ffffff",
};

const primaryButtonStyle: CSSProperties = {
  width: "100%",
  marginTop: 16,
  padding: 10,
  border: "none",
  borderRadius: 8,
  color: "#ffffff",
  background: "#2563eb",
  fontWeight: 700,
  cursor: "pointer",
};

const listStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 9,
  marginTop: 16,
};

const itemStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: 12,
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  background: "#ffffff",
};

const activeViewpointItemStyle: CSSProperties = {
  ...itemStyle,
  borderColor: "#2563eb",
  background: "#eff6ff",
};

const mutedTextStyle: CSSProperties = {
  display: "block",
  marginTop: 3,
  color: "#64748b",
  fontSize: 11,
};

const itemActionsStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  gap: 5,
};

const secondaryButtonStyle: CSSProperties = {
  padding: "6px 8px",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  color: "#334155",
  background: "#ffffff",
  fontSize: 11,
  cursor: "pointer",
};

const dangerButtonStyle: CSSProperties = {
  ...secondaryButtonStyle,
  borderColor: "#fecaca",
  color: "#b91c1c",
  background: "#fef2f2",
};

const selectedFileStyle: CSSProperties = {
  display: "block",
  marginTop: 7,
  color: "#475569",
};

const viewpointGroupStyle: CSSProperties = {
  padding: 14,
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  background: "#f1f5f9",
};

const warningTextStyle: CSSProperties = {
  color: "#b45309",
  fontSize: 12,
};

const thumbnailRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const thumbnailStyle: CSSProperties = {
  width: 74,
  height: 48,
  objectFit: "cover",
  borderRadius: 6,
  background: "#cbd5e1",
};