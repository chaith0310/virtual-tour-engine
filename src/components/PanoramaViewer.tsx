import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react";

import {
  EquirectangularAdapter,
  Viewer,
} from "@photo-sphere-viewer/core";

import {
  MarkersPlugin,
} from "@photo-sphere-viewer/markers-plugin";

import "@photo-sphere-viewer/core/index.css";
import "@photo-sphere-viewer/markers-plugin/index.css";


import {
  clearTourDraft,
  getAllViewpoints,
  getSpaceForViewpoint,
  getViewpoint,
  initialTour,
  loadTourDraft,
  saveTourDraft,
  validateTour,
  type Hotspot,
  type HotspotType,
  type TourData,
} from "../data/tour";

import StructureManager from "./StructureManager";

import {
  resolvePanoramaUrl,
} from "../data/assetStore";


type EditorMode = "EDITOR" | "PREVIEW";

type PendingPosition = {
  yaw: number;
  pitch: number;
};

type HotspotFormData = {
  type: HotspotType;

  label: string;

  targetViewpointId: string;

  title: string;
  description: string;
  imageUrl: string;

  websiteLabel: string;
  websiteUrl: string;

  mapLabel: string;
  mapUrl: string;
};

const emptyHotspotForm: HotspotFormData = {
  type: "SPACE_NAVIGATION",

  label: "",

  targetViewpointId:
    "kitchen-center",

  title: "",
  description: "",
  imageUrl: "",

  websiteLabel: "Open website",
  websiteUrl: "",

  mapLabel: "View on Google Maps",
  mapUrl: "",
};

export default function PanoramaViewer() {
  const containerRef =
    useRef<HTMLDivElement>(null);

  const viewerRef =
    useRef<Viewer | null>(null);

  const markersPluginRef =
    useRef<MarkersPlugin | null>(null);

  const [tour, setTour] = useState<TourData>(
  () => loadTourDraft(),

);

const [
  currentViewpointId,
  setCurrentViewpointId,
] = useState<string>(
  () => tour.startViewpointId,
);

const tourRef = useRef<TourData>(tour);

const currentViewpointRef = useRef<string>(
  currentViewpointId,
);

const editorModeRef =
  useRef<EditorMode>("EDITOR");

const movingHotspotIdRef =
  useRef<string | null>(null);

  const [editorMode, setEditorMode] =
    useState<EditorMode>("EDITOR");

  const [
    pendingPosition,
    setPendingPosition,
  ] =
    useState<PendingPosition | null>(
      null,
    );

  const [
    hotspotForm,
    setHotspotForm,
  ] = useState<HotspotFormData>(
    emptyHotspotForm,
  );

  const [
    editingHotspotId,
    setEditingHotspotId,
  ] = useState<string | null>(null);

  const [
    showHotspotForm,
    setShowHotspotForm,
  ] = useState(false);

  const [
    selectedCardHotspot,
    setSelectedCardHotspot,
  ] = useState<Hotspot | null>(null);

  const [
    movingHotspotId,
    setMovingHotspotId,
  ] = useState<string | null>(null);

  const [
    showValidation,
    setShowValidation,
  ] = useState(false);

  const [
    showSidebar,
    setShowSidebar,
  ] = useState(true);

  const [
  showStructureManager,
  setShowStructureManager,
] = useState(false);

  const importInputRef =
    useRef<HTMLInputElement>(null);

  /*
   * Keep event-handler refs in sync.
   */

  useEffect(() => {
    tourRef.current = tour;
    saveTourDraft(tour);
  }, [tour]);

  useEffect(() => {
    editorModeRef.current =
      editorMode;
  }, [editorMode]);

  useEffect(() => {
    movingHotspotIdRef.current =
      movingHotspotId;
  }, [movingHotspotId]);

  useEffect(() => {
    currentViewpointRef.current =
      currentViewpointId;
  }, [currentViewpointId]);

  const allViewpoints = useMemo(
    () => getAllViewpoints(tour),
    [tour],
  );

  const currentViewpoint =
    getViewpoint(
      tour,
      currentViewpointId,
    );

  const currentSpace =
    getSpaceForViewpoint(
      tour,
      currentViewpointId,
    );

  const currentHotspots =
    tour.hotspots.filter(
      (hotspot) =>
        hotspot.enabled &&
        hotspot.sourceViewpointId ===
          currentViewpointId,
    );

  const validation = useMemo(
    () => validateTour(tour),
    [tour],
  );

  const getHotspotColor = (
    hotspot: Hotspot,
  ) => {
    switch (hotspot.type) {
      case "SPACE_NAVIGATION":
        return "#2563eb";

      case "VIEWPOINT_NAVIGATION":
        return "#7c3aed";

      case "INFORMATION":
        return "#f59e0b";

      case "RICH_CONTENT":
        return "#059669";

      case "EXTERNAL_REFERENCE":
        return "#dc2626";

      default:
        return "#475569";
    }
  };

  const getHotspotSize = (
    hotspot: Hotspot,
  ) => {
    if (
      hotspot.type ===
      "SPACE_NAVIGATION"
    ) {
      return 23;
    }

    return 19;
  };

  const renderHotspots =
    useCallback(
      (
        viewpointId: string,
        sourceTour?: TourData,
      ) => {
        const markersPlugin =
          markersPluginRef.current;

        if (!markersPlugin) {
          return;
        }

        const activeTour =
          sourceTour ??
          tourRef.current;

        markersPlugin.clearMarkers();

        activeTour.hotspots
          .filter(
            (hotspot) =>
              hotspot.enabled &&
              hotspot.sourceViewpointId ===
                viewpointId,
          )
          .forEach((hotspot) => {
            markersPlugin.addMarker({
              id: hotspot.id,

              position: {
                yaw: hotspot.yaw,
                pitch: hotspot.pitch,
              },

              circle:
                getHotspotSize(
                  hotspot,
                ),

              svgStyle: {
                fill:
                  getHotspotColor(
                    hotspot,
                  ),

                stroke: "#ffffff",
                strokeWidth: "4px",
              },

              tooltip: {
                content: hotspot.label,
                position: "top center",
                trigger: "hover",
              },

              hoverScale: {
                amount: 1.3,
                duration: 150,
              },

              data: {
                hotspotId:
                  hotspot.id,
              },
            });
          });
      },
      [],
    );

  const navigateToViewpoint =
    useCallback(
      async (
        viewpointId: string,
      ) => {
        const viewer =
          viewerRef.current;

        const viewpoint =
          getViewpoint(
            tourRef.current,
            viewpointId,
          );

        if (!viewer || !viewpoint) {
          return;
        }

        const panoramaUrl =
  await resolvePanoramaUrl(
    viewpoint.panorama,
  );

await viewer.setPanorama(
  panoramaUrl,
          {
            transition: {
              effect: "fade",
              speed: "16rpm",
              rotation: true,
            },

            position: {
              yaw:
                viewpoint.initialYaw,
              pitch:
                viewpoint.initialPitch,
            },

            zoom:
              viewpoint.initialZoom,
          },
        );

        currentViewpointRef.current =
          viewpointId;

        setCurrentViewpointId(
          viewpointId,
        );

        renderHotspots(
          viewpointId,
          tourRef.current,
        );
      },
      [renderHotspots],
    );

  const executeHotspot =
    useCallback(
      (hotspot: Hotspot) => {
        if (
          hotspot.type ===
            "SPACE_NAVIGATION" ||
          hotspot.type ===
            "VIEWPOINT_NAVIGATION"
        ) {
          if (
            hotspot.targetViewpointId
          ) {
            void navigateToViewpoint(
              hotspot.targetViewpointId,
            );
          }

          return;
        }

        setSelectedCardHotspot(
          hotspot,
        );
      },
      [navigateToViewpoint],
    );

  /*
   * Initialize Photo Sphere Viewer once.
   */

  useEffect(() => {
    const container =
      containerRef.current;

    if (!container) {
      return;
    }

    const preventContextMenu = (
      event: MouseEvent,
    ) => {
      event.preventDefault();
    };

    container.addEventListener(
      "contextmenu",
      preventContextMenu,
    );

    const startingViewpoint =
      getViewpoint(
        tourRef.current,
        tourRef.current
          .startViewpointId,
      );

    if (!startingViewpoint) {
      console.error(
        "Starting viewpoint does not exist.",
      );

      return;
    }

    const viewer = new Viewer({
      container,

      panorama:
        startingViewpoint.panorama,

      adapter:
        EquirectangularAdapter.withConfig(
          {
            useXmpData: false,
          },
        ),

      plugins: [
        MarkersPlugin.withConfig({
          markers: [],
          clickEventOnMarker: true,
        }),
      ],

      navbar: [
        "zoom",
        "move",
        "markers",
        "fullscreen",
      ],

      defaultYaw:
        startingViewpoint.initialYaw,

      defaultPitch:
        startingViewpoint.initialPitch,

      defaultZoomLvl:
        startingViewpoint.initialZoom,

      touchmoveTwoFingers: false,
      mousewheelCtrlKey: false,
    });

    const markersPlugin =
      viewer.getPlugin(
        MarkersPlugin,
      ) as unknown as MarkersPlugin;

    viewerRef.current = viewer;

    markersPluginRef.current =
      markersPlugin;

    viewer.addEventListener(
      "ready",
      () => {
        renderHotspots(
          currentViewpointRef.current,
          tourRef.current,
        );
      },
      {
        once: true,
      },
    );

    viewer.addEventListener(
      "click",
      ({ data }) => {
        if (!data.rightclick) {
          return;
        }

        if (
          editorModeRef.current !==
          "EDITOR"
        ) {
          return;
        }

        const hotspotToMove =
          movingHotspotIdRef.current;

        if (hotspotToMove) {
          const updatedTour: TourData =
            {
              ...tourRef.current,

              hotspots:
                tourRef.current.hotspots.map(
                  (hotspot) =>
                    hotspot.id ===
                    hotspotToMove
                      ? {
                          ...hotspot,

                          yaw:
                            data.yaw,

                          pitch:
                            data.pitch,

                          reviewStatus:
                            "NOT_REVIEWED",
                        }
                      : hotspot,
                ),

              updatedAt:
                new Date().toISOString(),
            };

          tourRef.current =
            updatedTour;

          setTour(updatedTour);
          setMovingHotspotId(null);

          renderHotspots(
            currentViewpointRef.current,
            updatedTour,
          );

          return;
        }

        setPendingPosition({
          yaw: data.yaw,
          pitch: data.pitch,
        });

        const destination =
          getAllViewpoints(
            tourRef.current,
          ).find(
            (viewpoint) =>
              viewpoint.id !==
              currentViewpointRef.current,
          );

        setHotspotForm({
          ...emptyHotspotForm,

          targetViewpointId:
            destination?.id ?? "",
        });

        setEditingHotspotId(null);
        setShowHotspotForm(true);
      },
    );

    markersPlugin.addEventListener(
      "select-marker",
      ({ marker }) => {
        const hotspot =
          tourRef.current.hotspots.find(
            (item) =>
              item.id === marker.id,
          );

        if (!hotspot) {
          return;
        }

        executeHotspot(hotspot);
      },
    );

    return () => {
      container.removeEventListener(
        "contextmenu",
        preventContextMenu,
      );

      viewer.destroy();

      viewerRef.current = null;
      markersPluginRef.current = null;
    };
  }, [
    executeHotspot,
    renderHotspots,
  ]);

  const openEditHotspot = (
    hotspot: Hotspot,
  ) => {
    setEditingHotspotId(
      hotspot.id,
    );

    setPendingPosition({
      yaw: hotspot.yaw,
      pitch: hotspot.pitch,
    });

    setHotspotForm({
      type: hotspot.type,

      label: hotspot.label,

      targetViewpointId:
        hotspot.targetViewpointId ??
        "",

      title: hotspot.title ?? "",
      description:
        hotspot.description ?? "",
      imageUrl:
        hotspot.imageUrl ?? "",

      websiteLabel:
        hotspot.websiteLabel ??
        "Open website",

      websiteUrl:
        hotspot.websiteUrl ?? "",

      mapLabel:
        hotspot.mapLabel ??
        "View on Google Maps",

      mapUrl:
        hotspot.mapUrl ?? "",
    });

    setShowHotspotForm(true);
  };

  const saveHotspot = () => {
    if (!pendingPosition) {
      return;
    }

    const label =
      hotspotForm.label.trim();

    if (!label) {
      window.alert(
        "Enter a hotspot label.",
      );

      return;
    }

    const navigationType =
      hotspotForm.type ===
        "SPACE_NAVIGATION" ||
      hotspotForm.type ===
        "VIEWPOINT_NAVIGATION";

    if (
      navigationType &&
      !hotspotForm.targetViewpointId
    ) {
      window.alert(
        "Choose a destination viewpoint.",
      );

      return;
    }

    const hotspot: Hotspot = {
      id:
        editingHotspotId ??
        crypto.randomUUID(),

      sourceViewpointId:
        currentViewpointRef.current,

      type: hotspotForm.type,

      label,

      yaw: pendingPosition.yaw,
      pitch: pendingPosition.pitch,

      targetViewpointId:
        navigationType
          ? hotspotForm.targetViewpointId
          : undefined,

      title:
        hotspotForm.title.trim() ||
        undefined,

      description:
        hotspotForm.description.trim() ||
        undefined,

      imageUrl:
        hotspotForm.imageUrl.trim() ||
        undefined,

      websiteLabel:
        hotspotForm.websiteLabel.trim() ||
        undefined,

      websiteUrl:
        hotspotForm.websiteUrl.trim() ||
        undefined,

      mapLabel:
        hotspotForm.mapLabel.trim() ||
        undefined,

      mapUrl:
        hotspotForm.mapUrl.trim() ||
        undefined,

      enabled: true,
      reviewStatus: "NOT_REVIEWED",
    };

    const existingIndex =
      tourRef.current.hotspots.findIndex(
        (item) =>
          item.id === hotspot.id,
      );

    const updatedHotspots =
      existingIndex >= 0
        ? tourRef.current.hotspots.map(
            (item) =>
              item.id === hotspot.id
                ? hotspot
                : item,
          )
        : [
            ...tourRef.current
              .hotspots,
            hotspot,
          ];

    const updatedTour: TourData = {
      ...tourRef.current,

      hotspots: updatedHotspots,

      updatedAt:
        new Date().toISOString(),
    };

    tourRef.current = updatedTour;

    setTour(updatedTour);

    renderHotspots(
      currentViewpointRef.current,
      updatedTour,
    );

    closeHotspotForm();
  };

  const deleteHotspot = (
    hotspotId: string,
  ) => {
    const confirmed =
      window.confirm(
        "Delete this hotspot?",
      );

    if (!confirmed) {
      return;
    }

    const updatedTour: TourData = {
      ...tourRef.current,

      hotspots:
        tourRef.current.hotspots.filter(
          (hotspot) =>
            hotspot.id !==
            hotspotId,
        ),

      updatedAt:
        new Date().toISOString(),
    };

    tourRef.current = updatedTour;

    setTour(updatedTour);

    renderHotspots(
      currentViewpointRef.current,
      updatedTour,
    );
  };

  const beginMoveHotspot = (
    hotspotId: string,
  ) => {
    setMovingHotspotId(
      hotspotId,
    );

    setShowHotspotForm(false);

    window.alert(
      "Right-click the panorama at the new hotspot position.",
    );
  };

  const closeHotspotForm = () => {
    setShowHotspotForm(false);
    setEditingHotspotId(null);
    setPendingPosition(null);
    setHotspotForm(
      emptyHotspotForm,
    );
  };

  const exportTour = () => {
    const exportData =
      JSON.stringify(
        tourRef.current,
        null,
        2,
      );

    const blob = new Blob(
      [exportData],
      {
        type: "application/json",
      },
    );

    const url =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement("a");

    anchor.href = url;
    anchor.download = `${tourRef.current.id}.json`;

    anchor.click();

    URL.revokeObjectURL(url);
  };

  const importTour = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const content =
        await file.text();

      const importedTour =
        JSON.parse(
          content,
        ) as TourData;

      if (
        importedTour.schemaVersion !==
        "1.0.0"
      ) {
        throw new Error(
          "Unsupported tour schema.",
        );
      }

      const updatedTour = {
        ...importedTour,

        /*
         * Preserve local imported
         * panorama paths for known
         * demonstration viewpoints.
         */

        spaces:
          importedTour.spaces.map(
            (space) => ({
              ...space,

              viewpoints:
                space.viewpoints.map(
                  (viewpoint) => {
                    const local =
                      getViewpoint(
                        initialTour,
                        viewpoint.id,
                      );

                    return {
                      ...viewpoint,

                      panorama:
                        local?.panorama ??
                        viewpoint.panorama,
                    };
                  },
                ),
            }),
          ),

        updatedAt:
          new Date().toISOString(),
      };

      tourRef.current =
        updatedTour;

      setTour(updatedTour);

      await navigateToViewpoint(
        updatedTour.startViewpointId,
      );
    } catch (error) {
      console.error(error);

      window.alert(
        "Could not import the tour JSON.",
      );
    } finally {
      event.target.value = "";
    }
  };

  const resetTour = async () => {
    const confirmed =
      window.confirm(
        "Reset the complete tour draft?",
      );

    if (!confirmed) {
      return;
    }

    clearTourDraft();

    const resetData: TourData = {
      ...initialTour,

      hotspots: [],

      updatedAt:
        new Date().toISOString(),
    };

    tourRef.current = resetData;

    setTour(resetData);

    await navigateToViewpoint(
      resetData.startViewpointId,
    );
  };

  const markCurrentReviewed = () => {
    const updatedTour: TourData = {
      ...tourRef.current,

      hotspots:
        tourRef.current.hotspots.map(
          (hotspot) =>
            hotspot.sourceViewpointId ===
            currentViewpointRef.current
              ? {
                  ...hotspot,

                  reviewStatus:
                    "REVIEWED",
                }
              : hotspot,
        ),

      updatedAt:
        new Date().toISOString(),
    };

    tourRef.current = updatedTour;
    setTour(updatedTour);
  };

  const publishTour = () => {
    const result =
      validateTour(
        tourRef.current,
      );

    setShowValidation(true);

    if (result.errors.length > 0) {
      window.alert(
        "Fix the validation errors before publishing.",
      );

      return;
    }

    window.alert(
      "Tour validation passed. The client-side MVP is ready for JSON export.",
    );
  };

  return (
    <div style={pageStyle}>
      <div
        ref={containerRef}
        style={viewerStyle}
      />

      {/* Top toolbar */}

      <div style={toolbarStyle}>
        <button
          type="button"
          style={toolbarButtonStyle}
          onClick={() =>
            setShowSidebar(
              (value) => !value,
            )
          }
        >
          ☰ Tour
        </button>

        <button
  type="button"
  style={toolbarButtonStyle}
  onClick={() =>
    setShowStructureManager(true)
  }
>
  + Spaces & Views
</button>

        <div style={modeGroupStyle}>
          <button
            type="button"
            style={
              editorMode === "EDITOR"
                ? activeModeButtonStyle
                : toolbarButtonStyle
            }
            onClick={() =>
              setEditorMode("EDITOR")
            }
          >
            Edit
          </button>

          <button
            type="button"
            style={
              editorMode === "PREVIEW"
                ? activeModeButtonStyle
                : toolbarButtonStyle
            }
            onClick={() => {
              setEditorMode("PREVIEW");
              setShowHotspotForm(false);
              setMovingHotspotId(null);
            }}
          >
            Preview
          </button>
        </div>

        <button
          type="button"
          style={toolbarButtonStyle}
          onClick={() =>
            setShowValidation(
              (value) => !value,
            )
          }
        >
          Validate
          {validation.errors.length > 0
            ? ` (${validation.errors.length})`
            : ""}
        </button>

        <button
          type="button"
          style={toolbarButtonStyle}
          onClick={exportTour}
        >
          Export JSON
        </button>

        <button
          type="button"
          style={toolbarButtonStyle}
          onClick={() =>
            importInputRef.current?.click()
          }
        >
          Import JSON
        </button>

        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(event) =>
            void importTour(event)
          }
        />

        <button
          type="button"
          style={publishButtonStyle}
          onClick={publishTour}
        >
          Publish Check
        </button>
      </div>

      {/* Current viewpoint status */}

      <div style={statusStyle}>
        <strong>
          {currentSpace?.title ??
            "Unknown Space"}
        </strong>

        <span>
          {currentViewpoint?.title ??
            "Unknown Viewpoint"}
        </span>

        {editorMode === "EDITOR" && (
          <small>
            {movingHotspotId
              ? "Right-click to place the hotspot at its new position"
              : "Right-click anywhere to add a hotspot"}
          </small>
        )}
      </div>

      {/* Tour sidebar */}

      {showSidebar && (
        <aside style={sidebarStyle}>
          <h2 style={sidebarTitleStyle}>
            {tour.title}
          </h2>

          <p style={sidebarSubtitleStyle}>
            Spaces and viewpoints
          </p>

          {[...tour.spaces]
            .filter(
              (space) => space.enabled,
            )
            .sort(
              (a, b) =>
                a.displayOrder -
                b.displayOrder,
            )
            .map((space) => (
              <section
                key={space.id}
                style={spaceSectionStyle}
              >
                <h3
                  style={
                    spaceTitleStyle
                  }
                >
                  {space.title}
                </h3>

                {[...space.viewpoints]
                  .filter(
                    (viewpoint) =>
                      viewpoint.enabled,
                  )
                  .sort(
                    (a, b) =>
                      a.displayOrder -
                      b.displayOrder,
                  )
                  .map((viewpoint) => (
                    <button
                      key={viewpoint.id}
                      type="button"
                      onClick={() =>
                        void navigateToViewpoint(
                          viewpoint.id,
                        )
                      }
                      style={
                        viewpoint.id ===
                        currentViewpointId
                          ? activeViewpointStyle
                          : viewpointButtonStyle
                      }
                    >
                      <span>
                        {
                          viewpoint.title
                        }
                      </span>

                      <small>
                        {viewpoint.role}
                      </small>
                    </button>
                  ))}
              </section>
            ))}

          {editorMode === "EDITOR" && (
            <>
              <div
                style={
                  sidebarDividerStyle
                }
              />

              <h3
                style={
                  hotspotListTitleStyle
                }
              >
                Current hotspots
              </h3>

              {currentHotspots.length ===
              0 ? (
                <p
                  style={
                    emptyHotspotStyle
                  }
                >
                  No hotspots in this
                  viewpoint.
                </p>
              ) : (
                currentHotspots.map(
                  (hotspot) => (
                    <div
                      key={hotspot.id}
                      style={
                        hotspotListItemStyle
                      }
                    >
                      <div>
                        <strong>
                          {
                            hotspot.label
                          }
                        </strong>

                        <small
                          style={{
                            display:
                              "block",

                            color:
                              "#64748b",
                          }}
                        >
                          {hotspot.type}
                        </small>
                      </div>

                      <div
                        style={{
                          display:
                            "flex",

                          gap: "5px",
                        }}
                      >
                        <button
                          type="button"
                          style={
                            miniButtonStyle
                          }
                          onClick={() =>
                            openEditHotspot(
                              hotspot,
                            )
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          style={
                            miniButtonStyle
                          }
                          onClick={() =>
                            beginMoveHotspot(
                              hotspot.id,
                            )
                          }
                        >
                          Move
                        </button>

                        <button
                          type="button"
                          style={
                            deleteMiniButtonStyle
                          }
                          onClick={() =>
                            deleteHotspot(
                              hotspot.id,
                            )
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ),
                )
              )}

              <button
                type="button"
                style={
                  reviewedButtonStyle
                }
                onClick={
                  markCurrentReviewed
                }
              >
                Mark current view reviewed
              </button>

              <button
                type="button"
                style={resetButtonStyle}
                onClick={() =>
                  void resetTour()
                }
              >
                Reset draft
              </button>
            </>
          )}
        </aside>
      )}

      {/* Validation panel */}

      {showValidation && (
        <div style={validationStyle}>
          <div
            style={
              validationHeaderStyle
            }
          >
            <strong>
              Tour Validation
            </strong>

            <button
              type="button"
              style={closeTextButtonStyle}
              onClick={() =>
                setShowValidation(false)
              }
            >
              Close
            </button>
          </div>

          <div>
            <strong
              style={{
                color: "#dc2626",
              }}
            >
              Errors:{" "}
              {
                validation.errors
                  .length
              }
            </strong>

            {validation.errors.map(
              (error) => (
                <p
                  key={error}
                  style={
                    validationItemStyle
                  }
                >
                  ❌ {error}
                </p>
              ),
            )}
          </div>

          <div>
            <strong
              style={{
                color: "#d97706",
              }}
            >
              Warnings:{" "}
              {
                validation.warnings
                  .length
              }
            </strong>

            {validation.warnings.map(
              (warning) => (
                <p
                  key={warning}
                  style={
                    validationItemStyle
                  }
                >
                  ⚠️ {warning}
                </p>
              ),
            )}
          </div>

          {validation.errors.length ===
            0 &&
            validation.warnings.length ===
              0 && (
              <p
                style={{
                  color: "#059669",
                }}
              >
                ✅ No validation issues.
              </p>
            )}
        </div>
      )}

      {/* Add/Edit hotspot form */}

      {showHotspotForm &&
        editorMode === "EDITOR" && (
          <div style={overlayStyle}>
            <div style={dialogStyle}>
              <div
                style={
                  dialogHeaderStyle
                }
              >
                <div>
                  <h2
                    style={
                      dialogTitleStyle
                    }
                  >
                    {editingHotspotId
                      ? "Edit Hotspot"
                      : "Add Hotspot"}
                  </h2>

                  <p
                    style={
                      dialogSubtitleStyle
                    }
                  >
                    Source:{" "}
                    {
                      currentViewpoint
                        ?.title
                    }
                  </p>
                </div>

                <button
                  type="button"
                  style={
                    closeTextButtonStyle
                  }
                  onClick={
                    closeHotspotForm
                  }
                >
                  Close
                </button>
              </div>

              <label style={labelStyle}>
                Hotspot type
              </label>

              <select
                style={inputStyle}
                value={hotspotForm.type}
                onChange={(event) =>
                  setHotspotForm(
                    (current) => ({
                      ...current,

                      type: event.target
                        .value as HotspotType,
                    }),
                  )
                }
              >
                <option value="SPACE_NAVIGATION">
                  Go to another space
                </option>

                <option value="VIEWPOINT_NAVIGATION">
                  Go to another
                  viewpoint
                </option>

                <option value="INFORMATION">
                  Information label
                </option>

                <option value="RICH_CONTENT">
                  Rich content card
                </option>

                <option value="EXTERNAL_REFERENCE">
                  External reference
                </option>
              </select>

              <label style={labelStyle}>
                Hotspot label
              </label>

              <input
                style={inputStyle}
                value={
                  hotspotForm.label
                }
                placeholder="Example: Go to Kitchen"
                onChange={(event) =>
                  setHotspotForm(
                    (current) => ({
                      ...current,

                      label:
                        event.target
                          .value,
                    }),
                  )
                }
                autoFocus
              />

              {(hotspotForm.type ===
                "SPACE_NAVIGATION" ||
                hotspotForm.type ===
                  "VIEWPOINT_NAVIGATION") && (
                <>
                  <label
                    style={labelStyle}
                  >
                    Destination
                  </label>

                  <select
                    style={inputStyle}
                    value={
                      hotspotForm
                        .targetViewpointId
                    }
                    onChange={(event) =>
                      setHotspotForm(
                        (current) => ({
                          ...current,

                          targetViewpointId:
                            event.target
                              .value,
                        }),
                      )
                    }
                  >
                    <option value="">
                      Select destination
                    </option>

                    {allViewpoints
                      .filter(
                        (viewpoint) =>
                          viewpoint.id !==
                          currentViewpointId,
                      )
                      .map(
                        (viewpoint) => {
                          const space =
                            getSpaceForViewpoint(
                              tour,
                              viewpoint.id,
                            );

                          return (
                            <option
                              key={
                                viewpoint.id
                              }
                              value={
                                viewpoint.id
                              }
                            >
                              {
                                space?.title
                              }{" "}
                              -{" "}
                              {
                                viewpoint.title
                              }
                            </option>
                          );
                        },
                      )}
                  </select>
                </>
              )}

              {(hotspotForm.type ===
                "INFORMATION" ||
                hotspotForm.type ===
                  "RICH_CONTENT" ||
                hotspotForm.type ===
                  "EXTERNAL_REFERENCE") && (
                <>
                  <label
                    style={labelStyle}
                  >
                    Card title
                  </label>

                  <input
                    style={inputStyle}
                    value={
                      hotspotForm.title
                    }
                    placeholder="Example: Fully Furnished Cupboards"
                    onChange={(event) =>
                      setHotspotForm(
                        (current) => ({
                          ...current,

                          title:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />

                  <label
                    style={labelStyle}
                  >
                    Description
                  </label>

                  <textarea
                    style={{
                      ...inputStyle,
                      minHeight: "90px",
                      resize:
                        "vertical",
                    }}
                    value={
                      hotspotForm.description
                    }
                    placeholder="Add property highlight details"
                    onChange={(event) =>
                      setHotspotForm(
                        (current) => ({
                          ...current,

                          description:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />

                  <label
                    style={labelStyle}
                  >
                    Image URL
                  </label>

                  <input
                    style={inputStyle}
                    value={
                      hotspotForm.imageUrl
                    }
                    placeholder="https://..."
                    onChange={(event) =>
                      setHotspotForm(
                        (current) => ({
                          ...current,

                          imageUrl:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />
                </>
              )}

              {(hotspotForm.type ===
                "RICH_CONTENT" ||
                hotspotForm.type ===
                  "EXTERNAL_REFERENCE") && (
                <>
                  <label
                    style={labelStyle}
                  >
                    Website button
                    label
                  </label>

                  <input
                    style={inputStyle}
                    value={
                      hotspotForm.websiteLabel
                    }
                    onChange={(event) =>
                      setHotspotForm(
                        (current) => ({
                          ...current,

                          websiteLabel:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />

                  <label
                    style={labelStyle}
                  >
                    Website URL
                  </label>

                  <input
                    style={inputStyle}
                    value={
                      hotspotForm.websiteUrl
                    }
                    placeholder="https://..."
                    onChange={(event) =>
                      setHotspotForm(
                        (current) => ({
                          ...current,

                          websiteUrl:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />

                  <label
                    style={labelStyle}
                  >
                    Google Maps button
                    label
                  </label>

                  <input
                    style={inputStyle}
                    value={
                      hotspotForm.mapLabel
                    }
                    onChange={(event) =>
                      setHotspotForm(
                        (current) => ({
                          ...current,

                          mapLabel:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />

                  <label
                    style={labelStyle}
                  >
                    Google Maps URL
                  </label>

                  <input
                    style={inputStyle}
                    value={
                      hotspotForm.mapUrl
                    }
                    placeholder="https://..."
                    onChange={(event) =>
                      setHotspotForm(
                        (current) => ({
                          ...current,

                          mapUrl:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />
                </>
              )}

              <div
                style={
                  dialogActionsStyle
                }
              >
                <button
                  type="button"
                  style={
                    cancelButtonStyle
                  }
                  onClick={
                    closeHotspotForm
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  style={saveButtonStyle}
                  onClick={saveHotspot}
                >
                  {editingHotspotId
                    ? "Save Changes"
                    : "Add Hotspot"}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Information / Rich Content Card */}

      {selectedCardHotspot && (
        <div style={overlayStyle}>
          <article style={cardStyle}>
            {selectedCardHotspot.imageUrl && (
              <img
                src={
                  selectedCardHotspot.imageUrl
                }
                alt={
                  selectedCardHotspot.title ??
                  selectedCardHotspot.label
                }
                style={cardImageStyle}
              />
            )}

            <div
              style={
                cardContentStyle
              }
            >
              <h2
                style={cardTitleStyle}
              >
                {selectedCardHotspot.title ??
                  selectedCardHotspot.label}
              </h2>

              {selectedCardHotspot.description && (
                <p
                  style={
                    cardDescriptionStyle
                  }
                >
                  {
                    selectedCardHotspot.description
                  }
                </p>
              )}

              <div
                style={
                  cardActionsStyle
                }
              >
                {selectedCardHotspot.websiteUrl && (
                  <a
                    href={
                      selectedCardHotspot.websiteUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    style={cardLinkStyle}
                  >
                    {selectedCardHotspot.websiteLabel ??
                      "Open website"}
                  </a>
                )}

                {selectedCardHotspot.mapUrl && (
                  <a
                    href={
                      selectedCardHotspot.mapUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    style={
                      mapCardLinkStyle
                    }
                  >
                    {selectedCardHotspot.mapLabel ??
                      "View on Google Maps"}
                  </a>
                )}
              </div>

              <button
                type="button"
                style={closeCardButtonStyle}
                onClick={() =>
                  setSelectedCardHotspot(
                    null,
                  )
                }
              >
                Close
              </button>
            </div>
          </article>
        </div>
      )}
      {showStructureManager &&
  editorMode === "EDITOR" && (
    <StructureManager
      tour={tour}
      currentViewpointId={
        currentViewpointId
      }
      onTourChange={(
        updatedTour,
      ) => {
        tourRef.current =
          updatedTour;

        setTour(updatedTour);
      }}
      onNavigate={
        navigateToViewpoint
      }
      onClose={() =>
        setShowStructureManager(
          false,
        )
      }
    />
  )}
    </div>
  );
}

/*
 * Styles
 */

const pageStyle: CSSProperties = {
  position: "relative",
  width: "100vw",
  height: "100vh",
  overflow: "hidden",
  fontFamily:
    "Inter, Arial, sans-serif",
};

const viewerStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  backgroundColor: "#111827",
};

const toolbarStyle: CSSProperties = {
  position: "absolute",
  top: 14,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 1200,

  display: "flex",
  alignItems: "center",
  gap: 7,

  padding: 7,

  maxWidth:
    "calc(100vw - 40px)",

  overflowX: "auto",

  borderRadius: 12,

  background:
    "rgba(15, 23, 42, 0.92)",

  boxShadow:
    "0 14px 35px rgba(0,0,0,0.28)",
};

const toolbarButtonStyle: CSSProperties = {
  border:
    "1px solid rgba(255,255,255,0.18)",

  borderRadius: 8,
  padding: "8px 11px",

  whiteSpace: "nowrap",

  color: "#e2e8f0",
  background:
    "rgba(255,255,255,0.05)",

  cursor: "pointer",
};

const activeModeButtonStyle: CSSProperties = {
  ...toolbarButtonStyle,

  color: "#ffffff",
  background: "#2563eb",
};

const publishButtonStyle: CSSProperties = {
  ...toolbarButtonStyle,

  color: "#ffffff",
  background: "#059669",

  fontWeight: 700,
};

const modeGroupStyle: CSSProperties = {
  display: "flex",
  gap: 4,
};

const statusStyle: CSSProperties = {
  position: "absolute",
  top: 76,
  right: 16,
  zIndex: 1050,

  display: "flex",
  flexDirection: "column",
  gap: 3,

  minWidth: 190,

  padding: "12px 15px",

  color: "#ffffff",

  borderRadius: 12,

  background:
    "rgba(15, 23, 42, 0.90)",

  boxShadow:
    "0 12px 30px rgba(0,0,0,0.25)",
};

const sidebarStyle: CSSProperties = {
  position: "absolute",
  top: 76,
  left: 16,
  bottom: 56,
  zIndex: 1100,

  width: 310,

  padding: 16,

  overflowY: "auto",

  borderRadius: 14,

  background:
    "rgba(255,255,255,0.96)",

  boxShadow:
    "0 18px 45px rgba(0,0,0,0.28)",
};

const sidebarTitleStyle: CSSProperties = {
  margin: 0,

  color: "#0f172a",
  fontSize: 19,
};

const sidebarSubtitleStyle: CSSProperties = {
  marginTop: 4,

  color: "#64748b",
  fontSize: 13,
};

const spaceSectionStyle: CSSProperties = {
  marginTop: 17,
};

const spaceTitleStyle: CSSProperties = {
  marginBottom: 7,

  color: "#334155",
  fontSize: 14,
};

const viewpointButtonStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",

  width: "100%",

  marginBottom: 6,
  padding: "9px 10px",

  border: "1px solid #e2e8f0",
  borderRadius: 8,

  color: "#334155",
  background: "#ffffff",

  cursor: "pointer",
};

const activeViewpointStyle: CSSProperties = {
  ...viewpointButtonStyle,

  borderColor: "#2563eb",

  color: "#1d4ed8",
  background: "#eff6ff",
};

const sidebarDividerStyle: CSSProperties = {
  height: 1,

  margin: "18px 0",

  background: "#e2e8f0",
};

const hotspotListTitleStyle: CSSProperties = {
  color: "#334155",
  fontSize: 14,
};

const emptyHotspotStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: 13,
};

const hotspotListItemStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,

  marginBottom: 9,
  padding: 10,

  border: "1px solid #e2e8f0",
  borderRadius: 9,

  background: "#f8fafc",
};

const miniButtonStyle: CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 6,

  padding: "5px 7px",

  color: "#334155",
  background: "#ffffff",

  fontSize: 11,
  cursor: "pointer",
};

const deleteMiniButtonStyle: CSSProperties = {
  ...miniButtonStyle,

  borderColor: "#fecaca",

  color: "#b91c1c",
  background: "#fef2f2",
};

const reviewedButtonStyle: CSSProperties = {
  width: "100%",

  marginTop: 12,
  padding: 9,

  border: "none",
  borderRadius: 8,

  color: "#ffffff",
  background: "#059669",

  cursor: "pointer",
};

const resetButtonStyle: CSSProperties = {
  width: "100%",

  marginTop: 8,
  padding: 9,

  border: "1px solid #fecaca",
  borderRadius: 8,

  color: "#b91c1c",
  background: "#fef2f2",

  cursor: "pointer",
};

const validationStyle: CSSProperties = {
  position: "absolute",
  top: 76,
  right: 16,
  zIndex: 1400,

  width: 370,
  maxHeight:
    "calc(100vh - 100px)",

  padding: 18,

  overflowY: "auto",

  borderRadius: 14,

  background:
    "rgba(255,255,255,0.98)",

  boxShadow:
    "0 20px 55px rgba(0,0,0,0.32)",
};

const validationHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",

  marginBottom: 16,
};

const validationItemStyle: CSSProperties = {
  margin: "7px 0",

  color: "#475569",
  fontSize: 13,
};

const overlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 3000,

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  padding: 20,

  background:
    "rgba(2, 6, 23, 0.72)",
};

const dialogStyle: CSSProperties = {
  width: "100%",
  maxWidth: 510,
  maxHeight:
    "calc(100vh - 50px)",

  padding: 24,

  overflowY: "auto",

  borderRadius: 17,

  background: "#ffffff",

  boxShadow:
    "0 26px 80px rgba(0,0,0,0.40)",
};

const dialogHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 15,
};

const dialogTitleStyle: CSSProperties = {
  margin: 0,

  color: "#0f172a",
  fontSize: 22,
};

const dialogSubtitleStyle: CSSProperties = {
  marginTop: 4,

  color: "#64748b",
  fontSize: 13,
};

const closeTextButtonStyle: CSSProperties = {
  border: "none",

  color: "#475569",
  background: "transparent",

  cursor: "pointer",
};

const labelStyle: CSSProperties = {
  display: "block",

  marginTop: 13,
  marginBottom: 6,

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

  fontSize: 14,
};

const dialogActionsStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 9,

  marginTop: 22,
};

const cancelButtonStyle: CSSProperties = {
  padding: "10px 15px",

  border: "1px solid #cbd5e1",
  borderRadius: 8,

  color: "#334155",
  background: "#ffffff",

  cursor: "pointer",
};

const saveButtonStyle: CSSProperties = {
  padding: "10px 15px",

  border: "none",
  borderRadius: 8,

  color: "#ffffff",
  background: "#2563eb",

  fontWeight: 700,
  cursor: "pointer",
};

const cardStyle: CSSProperties = {
  width: "100%",
  maxWidth: 520,

  overflow: "hidden",

  borderRadius: 18,

  background: "#ffffff",

  boxShadow:
    "0 30px 90px rgba(0,0,0,0.45)",
};

const cardImageStyle: CSSProperties = {
  display: "block",

  width: "100%",
  maxHeight: 260,

  objectFit: "cover",
};

const cardContentStyle: CSSProperties = {
  padding: 24,
};

const cardTitleStyle: CSSProperties = {
  marginTop: 0,

  color: "#0f172a",
};

const cardDescriptionStyle: CSSProperties = {
  color: "#475569",
  lineHeight: 1.6,
};

const cardActionsStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 9,

  marginTop: 18,
};

const cardLinkStyle: CSSProperties = {
  padding: "10px 13px",

  borderRadius: 8,

  color: "#ffffff",
  background: "#2563eb",

  textDecoration: "none",
};

const mapCardLinkStyle: CSSProperties = {
  ...cardLinkStyle,

  background: "#059669",
};

const closeCardButtonStyle: CSSProperties = {
  width: "100%",

  marginTop: 18,
  padding: 10,

  border: "1px solid #cbd5e1",
  borderRadius: 8,

  color: "#334155",
  background: "#ffffff",

  cursor: "pointer",
};