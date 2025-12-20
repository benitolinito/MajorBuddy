import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import sharp from "sharp";

const width = 1200;
const height = 630;

const fontSources = {
  400: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf",
  500: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fMZg.ttf",
  600: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYMZg.ttf",
  700: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf"
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputPath = path.resolve(__dirname, "../public/og-image.png");
const svgOutputPath = path.resolve(__dirname, "../public/og-image.svg");

async function loadFonts() {
  const entries = Object.entries(fontSources);
  const fonts = await Promise.all(
    entries.map(async ([weight, url]) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load Inter font weight ${weight}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return {
        name: "Inter",
        data: Buffer.from(arrayBuffer),
        weight: Number(weight),
        style: "normal"
      };
    })
  );

  return fonts;
}

const featureChip = (label) => ({
  type: "div",
  props: {
    style: {
      display: "flex",
      alignItems: "center",
      padding: "12px 20px",
      borderRadius: "9999px",
      backgroundColor: "rgba(37, 99, 235, 0.12)",
      color: "#1d4ed8",
      fontSize: 18,
      fontWeight: 600
    },
    children: label
  }
});

const plannerChip = (label, tint = "rgba(148, 163, 184, 0.3)") => ({
  type: "div",
  props: {
    style: {
      padding: "8px 16px",
      borderRadius: "12px",
      backgroundColor: tint,
      color: "rgba(226, 232, 240, 0.9)",
      fontSize: 16,
      fontWeight: 600
    },
    children: label
  }
});

const courseCard = ({ title, code, tag, tagColor, badges, credits }) => ({
  type: "div",
  props: {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12,
      padding: "18px 20px",
      borderRadius: 24,
      backgroundColor: "rgba(15, 23, 42, 0.9)",
      border: "1px solid rgba(148, 163, 184, 0.25)",
      boxShadow: "0 20px 45px rgba(15, 23, 42, 0.35)"
    },
    children: [
      {
        type: "div",
        props: {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16
          },
          children: [
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  gap: 4
                },
                children: [
                  {
                    type: "span",
                    props: {
                      style: {
                        fontSize: 14,
                        color: "rgba(148, 163, 184, 0.9)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em"
                      },
                      children: code
                    }
                  },
                  {
                    type: "span",
                    props: {
                      style: {
                        fontSize: 24,
                        fontWeight: 600,
                        color: "#f8fafc"
                      },
                      children: title
                    }
                  }
                ]
              }
            },
            {
              type: "span",
              props: {
                style: {
                  backgroundColor: tagColor,
                  color: "white",
                  padding: "6px 18px",
                  borderRadius: 9999,
                  fontSize: 16,
                  fontWeight: 600
                },
                children: tag
              }
            }
          ]
        }
      },
      {
        type: "div",
        props: {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "rgba(226, 232, 240, 0.85)",
            fontSize: 18,
            fontWeight: 500
          },
          children: [
            {
              type: "div",
              props: {
                style: { display: "flex", gap: 10, flexWrap: "wrap" },
                children: badges.map((badge) =>
                  plannerChip(badge, "rgba(59, 130, 246, 0.18)")
                )
              }
            },
            {
              type: "span",
              props: {
                style: {
                  color: "rgba(226, 232, 240, 0.95)",
                  fontSize: 20,
                  fontWeight: 700
                },
                children: credits
              }
            }
          ]
        }
      }
    ]
  }
});

async function createOgImage() {
  const fonts = await loadFonts();

  const courseCardsData = [
    {
      title: "Systems Programming",
      code: "CS 220",
      tag: "Major: CS",
      tagColor: "#3b82f6",
      badges: ["SCI/LAB"],
      credits: "4 cr"
    },
    {
      title: "Discrete Math",
      code: "MATH 231",
      tag: "Minor: Mathematics",
      tagColor: "#a855f7",
      badges: ["PHIL"],
      credits: "4 cr"
    },
    {
      title: "Interactive Media Studio",
      code: "DES 310",
      tag: "",
      tagColor: "#f97316",
    //   tagColor: "#f97316",
      badges: ["Portfolio", "Collab"],
      credits: "3 cr"
    }
  ];

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "60px 72px",
          backgroundColor: "#eef2ff",
          backgroundImage:
            "linear-gradient(135deg, #eef4ff 0%, #d9e8ff 45%, #f8fbff 100%)",
          color: "#0f172a",
          fontFamily: "Inter",
          position: "relative",
          overflow: "hidden"
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                position: "relative"
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: 28,
                      fontWeight: 700,
                      color: "#0f172a"
                    },
                    children: "MajorBuddy"
                  }
                },
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      gap: 18,
                      color: "#1e3a8a",
                      fontSize: 20,
                      fontWeight: 600
                    },
                    children: ["", "", "", ""]
                  }
                }
              ]
            }
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                gap: 48,
                marginTop: 36,
                position: "relative"
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 24
                    },
                    children: [
                      {
                        type: "span",
                        props: {
                          style: {
                            fontSize: 16,
                            letterSpacing: "0.24em",
                            textTransform: "uppercase",
                            color: "#2563eb",
                            fontWeight: 700
                          },
                          children: "Stay on track"
                        }
                      },
                      {
                        type: "div",
                        props: {
                          style: {
                            fontSize: 64,
                            fontWeight: 700,
                            lineHeight: 1.05
                          },
                          children:
                            "Design every major and minor in one friendly canvas."
                        }
                      },
                      {
                        type: "div",
                        props: {
                          style: {
                            fontSize: 24,
                            lineHeight: 1.4,
                            color: "#475569",
                            maxWidth: 520
                          },
                          children:
                            "Drag and drop, plan sharing, built-in audits, profile syncing and more"
                        }
                      },
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            gap: 16,
                            marginTop: 8
                          },
                          children: [
                            {
                              type: "div",
                              props: {
                                style: {
                                  backgroundColor: "#1d4ed8",
                                  color: "white",
                                  padding: "18px 32px",
                                  borderRadius: 9999,
                                  fontSize: 22,
                                  fontWeight: 600,
                                  boxShadow:
                                    "0 20px 45px rgba(37, 99, 235, 0.35)"
                                },
                                children: "Launch planner"
                              }
                            },
                            {
                              type: "div",
                              props: {
                                style: {
                                  backgroundColor: "rgba(37, 99, 235, 0.08)",
                                  color: "#1d4ed8",
                                  padding: "18px 28px",
                                  borderRadius: 9999,
                                  fontSize: 22,
                                  fontWeight: 600
                                },
                                children: "Share a plan"
                              }
                            }
                          ]
                        }
                      },
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 16
                          },
                          children: [
                            featureChip("Plan snapshots"),
                            featureChip("Cloud sync"),
                            featureChip("Export-ready")
                          ]
                        }
                      }
                    ]
                  }
                },
                {
                  type: "div",
                  props: {
                    style: {
                      flex: 1,
                      backgroundColor: "#0f172a",
                      borderRadius: 36,
                      padding: 32,
                      display: "flex",
                      flexDirection: "column",
                      gap: 18,
                      boxShadow: "0 45px 90px rgba(15, 23, 42, 0.55)",
                      position: "relative",
                      color: "white"
                    },
                    children: [
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          },
                          children: [
                            {
                              type: "div",
                              props: {
                                style: {
                                  display: "flex",
                                  gap: 10
                                },
                                children: [
                                  plannerChip("Configuration"),
                                  plannerChip("Class Library")
                                ]
                              }
                            },
                            plannerChip("Fall 2026", "rgba(59, 130, 246, 0.25)")
                            
                          ]
                        }
                      },
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            gap: 12,
                            color: "rgba(226, 232, 240, 0.85)",
                            fontSize: 18
                          },
                          children: [
                            "",
                            "",
                            "Smart audit: complete!"
                          ]
                        }
                      },
                      ...courseCardsData.map(courseCard),
                      {
                        type: "div",
                        props: {
                          style: {
                            marginTop: 4,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            paddingTop: 12,
                            borderTop: "1px solid rgba(148, 163, 184, 0.3)",
                            color: "rgba(226, 232, 240, 0.8)",
                            fontSize: 18
                          },
                          children: [
                            {
                              type: "div",
                              props: {
                                style: { display: "flex", gap: 12 },
                                children: [
                                  plannerChip("Audit export", "rgba(37, 99, 235, 0.18)"),
                                  plannerChip("Share link", "rgba(14, 165, 233, 0.2)")
                                ]
                              }
                            },
                            {
                              type: "span",
                              props: {
                                style: { fontWeight: 700 },
                                children: "Drag • Drop • Ship"
                              }
                            }
                          ]
                        }
                      }
                    ]
                  }
                }
              ]
            }
          },
          {
            type: "div",
            props: {
              style: {
                marginTop: 40,
                display: "flex",
                gap: 24,
                flexWrap: "wrap",
                fontSize: 20,
                fontWeight: 600,
                color: "#1e3a8a"
              },
              children: [
                "Multi-plan profiles",
                "Distributive progress tracking",
                "Link sharing with viewer/editor modes"
              ]
            }
          }
        ]
      }
    },
    {
      width,
      height,
      fonts
    }
  );

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(svgOutputPath, svg);

  await sharp(Buffer.from(svg))
    .resize(width, height, { fit: "cover" })
    .png({ compressionLevel: 6 })
    .toFile(outputPath);

  console.log(`OG image generated at ${outputPath}`);
}

createOgImage().catch((error) => {
  console.error("Failed to generate OG image", error);
  process.exitCode = 1;
});
