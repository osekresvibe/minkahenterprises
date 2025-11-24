import html2canvas from "html2canvas";

export interface PostImageData {
  title: string;
  content: string;
  imageUrl?: string;
  organizationName: string;
  organizationLogo?: string;
  createdAt: Date;
}

export async function generatePostImage(data: PostImageData): Promise<Blob> {
  const container = document.createElement("div");
  container.style.width = "1080px";
  container.style.backgroundColor = "#ffffff";
  container.style.padding = "40px";
  container.style.fontFamily = "Inter, system-ui, sans-serif";
  container.style.boxSizing = "border-box";
  container.style.position = "absolute";
  container.style.left = "-9999px";

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(data.createdAt));

  const contentPreview = data.content.substring(0, 150).replace(/\n/g, " ");
  const hasMoreContent = data.content.length > 150;

  let html = `
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <!-- Header with org info -->
      <div style="display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px;">
        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px;">
          ${data.organizationName[0]}
        </div>
        <div>
          <div style="font-weight: 600; font-size: 16px; color: #000;">${data.organizationName}</div>
          <div style="font-size: 13px; color: #6b7280;">${formattedDate}</div>
        </div>
      </div>

      <!-- Post content -->
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <h1 style="font-size: 32px; font-weight: 700; color: #000; margin: 0; line-height: 1.3;">
          ${escapeHtml(data.title)}
        </h1>
        
        <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0;">
          ${escapeHtml(contentPreview)}${hasMoreContent ? "..." : ""}
        </p>
      </div>

      <!-- Featured image -->
      ${
        data.imageUrl
          ? `
        <div style="width: 100%; max-height: 400px; border-radius: 12px; overflow: hidden; background: #f3f4f6;">
          <img src="${data.imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" />
        </div>
      `
          : ""
      }

      <!-- CTA Footer -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #e5e7eb; padding-top: 16px;">
        <div style="font-size: 14px; color: #6b7280;">
          Join our community and stay connected
        </div>
        <div style="background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); color: white; padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 14px;">
          Learn More
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      backgroundColor: "#ffffff",
      scale: 2,
      logging: false,
    });

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to generate image"));
          }
        },
        "image/png",
        0.95
      );
    });
  } finally {
    document.body.removeChild(container);
  }
}

export function downloadImage(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function shareImageToClipboard(blob: Blob): Promise<void> {
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "image/png": blob,
      }),
    ]);
  } catch (error) {
    console.error("Failed to copy image to clipboard", error);
    throw error;
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
