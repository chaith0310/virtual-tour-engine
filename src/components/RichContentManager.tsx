import { useState, type CSSProperties } from "react";

type RichContentManagerProps = {
  onClose: () => void;
};

type RichContent = {
  id: string;
  title: string;
  description: string;
  gallery: string[];
  features: string[];
  brochureUrl: string;
  websiteUrl: string;
  mapsUrl: string;
};

export default function RichContentManager({ onClose }: RichContentManagerProps) {
  const [items, setItems] = useState<RichContent[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [feature, setFeature] = useState("");
  const [galleryUrl, setGalleryUrl] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [gallery, setGallery] = useState<string[]>([]);
  const [brochureUrl, setBrochureUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");

  const addFeature = () => {
    if (!feature.trim()) return;
    setFeatures([...features, feature.trim()]);
    setFeature("");
  };

  const addImage = () => {
    if (!galleryUrl.trim()) return;
    setGallery([...gallery, galleryUrl.trim()]);
    setGalleryUrl("");
  };

  const saveContent = () => {
    const content: RichContent = {
      id: crypto.randomUUID(),
      title,
      description,
      gallery,
      features,
      brochureUrl,
      websiteUrl,
      mapsUrl,
    };

    const next = [...items, content];
    setItems(next);
    localStorage.setItem('virtual-tour-rich-content', JSON.stringify(next));

    setTitle('');
    setDescription('');
    setFeatures([]);
    setGallery([]);
    setBrochureUrl('');
    setWebsiteUrl('');
    setMapsUrl('');
  };

  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        <h2>⭐ Rich Content Cards</h2>
        <p>Create property highlights and marketing cards.</p>

        <input style={inputStyle} value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Title" />
        <textarea style={textareaStyle} value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="Description" />

        <div style={rowStyle}>
          <input style={inputStyle} value={feature} onChange={(e)=>setFeature(e.target.value)} placeholder="Feature" />
          <button onClick={addFeature}>Add Feature</button>
        </div>

        <div style={rowStyle}>
          <input style={inputStyle} value={galleryUrl} onChange={(e)=>setGalleryUrl(e.target.value)} placeholder="Image URL" />
          <button onClick={addImage}>Add Image</button>
        </div>

        <input style={inputStyle} value={brochureUrl} onChange={(e)=>setBrochureUrl(e.target.value)} placeholder="Brochure URL" />
        <input style={inputStyle} value={websiteUrl} onChange={(e)=>setWebsiteUrl(e.target.value)} placeholder="Website URL" />
        <input style={inputStyle} value={mapsUrl} onChange={(e)=>setMapsUrl(e.target.value)} placeholder="Maps URL" />

        <button style={saveButtonStyle} onClick={saveContent}>Save Highlight</button>

        <h3>Saved Highlights ({items.length})</h3>
        {items.map(item => (
          <div key={item.id} style={cardStyle}>
            <strong>{item.title}</strong>
            <p>{item.description}</p>
          </div>
        ))}

        <button style={closeButtonStyle} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

const overlayStyle: CSSProperties = { position:'absolute', inset:0, background:'rgba(0,0,0,0.65)', display:'flex', justifyContent:'flex-end', zIndex:5000 };
const panelStyle: CSSProperties = { width:'100%', maxWidth:620, background:'#fff', padding:24, overflowY:'auto' };
const rowStyle: CSSProperties = { display:'flex', gap:8 };
const inputStyle: CSSProperties = { width:'100%', padding:10, marginBottom:8 };
const textareaStyle: CSSProperties = { width:'100%', minHeight:90, padding:10, marginBottom:8 };
const saveButtonStyle: CSSProperties = { padding:10, background:'#2563eb', color:'#fff', border:'none', borderRadius:8 };
const closeButtonStyle: CSSProperties = { marginTop:20, padding:10 };
const cardStyle: CSSProperties = { border:'1px solid #ddd', padding:10, borderRadius:8, marginTop:8 };