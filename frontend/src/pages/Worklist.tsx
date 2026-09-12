import { useEffect, useMemo, useState } from "react";
import { getStudies, Study } from "../lib/api";

// OHIF reads ?StudyInstanceUIDs= from the url and opens that study directly
const OHIF_URL = import.meta.env.VITE_OHIF_URL || "http://localhost:3000";

function formatDate(raw: string) {
  if (raw.length !== 8) return raw || "-";
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

// a few fake rows shaped like the real table, shown while studies load so
// the page doesn't just flash "loading..." on a blank screen
function SkeletonRows() {
  return (
    <>
      {[1, 2, 3, 4].map((n) => (
        <tr key={n} className="skeleton-row">
          <td><div className="skeleton-bar" style={{ width: "70%" }} /></td>
          <td><div className="skeleton-bar" style={{ width: "50%" }} /></td>
          <td><div className="skeleton-bar" style={{ width: "60%" }} /></td>
          <td><div className="skeleton-bar" style={{ width: "40px" }} /></td>
          <td><div className="skeleton-bar" style={{ width: "20px" }} /></td>
          <td><div className="skeleton-bar" style={{ width: "80%" }} /></td>
        </tr>
      ))}
    </>
  );
}

export function Worklist() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [search, setSearch] = useState("");
  const [modalityFilter, setModalityFilter] = useState("all");

  useEffect(() => {
    getStudies()
      .then(setStudies)
      .catch(() => setErr("couldn't load studies - is the backend running?"))
      .finally(() => setLoading(false));
  }, []);

  // every modality actually present in the data, so the dropdown only ever
  // shows options that exist instead of a hardcoded list
  const modalities = useMemo(() => {
    const set = new Set(studies.map((s) => s.modality).filter(Boolean));
    return Array.from(set).sort();
  }, [studies]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return studies.filter((s) => {
      const matchesSearch =
        !term ||
        s.patientName.toLowerCase().includes(term) ||
        s.patientId.toLowerCase().includes(term) ||
        s.description.toLowerCase().includes(term);

      const matchesModality = modalityFilter === "all" || s.modality === modalityFilter;

      return matchesSearch && matchesModality;
    });
  }, [studies, search, modalityFilter]);

  function openInViewer(uid: string) {
    window.open(`${OHIF_URL}/viewer?StudyInstanceUIDs=${uid}`, "_blank");
  }

  if (err) return <div className="page error">{err}</div>;

  return (
    <div className="page">
      <h1>Studies ({loading ? "..." : filtered.length})</h1>

      <div className="worklist-filters">
        <input
          type="text"
          placeholder="Search by patient, ID, or description"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={loading}
        />

        <select
          value={modalityFilter}
          onChange={(e) => setModalityFilter(e.target.value)}
          disabled={loading}
        >
          <option value="all">All modalities</option>
          {modalities.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {!loading && studies.length === 0 ? (
        <p>No studies yet. Upload a DICOM file to Orthanc to get started.</p>
      ) : !loading && filtered.length === 0 ? (
        <p>No studies match your search.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Patient ID</th>
              <th>Date</th>
              <th>Modality</th>
              <th>Series</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows />
            ) : (
              filtered.map((s) => (
                <tr key={s.studyUID} className="row" onClick={() => openInViewer(s.studyUID)}>
                  <td>{s.patientName}</td>
                  <td>{s.patientId}</td>
                  <td>{formatDate(s.date)}</td>
                  <td><span className="tag">{s.modality || "-"}</span></td>
                  <td>{s.seriesCount}</td>
                  <td>{s.description || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
