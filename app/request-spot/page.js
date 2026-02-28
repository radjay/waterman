"use client";

import { useState } from "react";
import { Header } from "../../components/layout/Header";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";

export default function RequestSpotPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Basic info
    name: "",
    country: "",
    sports: [],

    // Step 2: Optional details
    webcamUrl: "",
    windguruUrl: "",
    latitude: "",
    longitude: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleSport = (sport) => {
    setFormData(prev => ({
      ...prev,
      sports: prev.sports.includes(sport)
        ? prev.sports.filter(s => s !== sport)
        : [...prev.sports, sport]
    }));
  };

  const canProceedStep1 = formData.name.trim() && formData.country.trim() && formData.sports.length > 0;

  const handleSubmit = async () => {
    // TODO: Send to backend/API
    console.log("Submitting spot request:", formData);

    // For now, just show success
    setSubmitted(true);

    // Reset form after 3 seconds
    setTimeout(() => {
      setSubmitted(false);
      setStep(1);
      setFormData({
        name: "",
        country: "",
        sports: [],
        webcamUrl: "",
        windguruUrl: "",
        latitude: "",
        longitude: "",
      });
    }, 3000);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-newsprint">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-white" />
            </div>
            <h2 className="font-headline font-black text-2xl mb-2">Request Submitted!</h2>
            <p className="text-ink/60">We'll review your spot request and add it soon.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-newsprint">
      <Header />

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              step === 1 ? "bg-ink text-newsprint" : "bg-ink/20 text-ink/40"
            }`}>
              1
            </div>
            <div className="w-12 h-0.5 bg-ink/20" />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              step === 2 ? "bg-ink text-newsprint" : "bg-ink/20 text-ink/40"
            }`}>
              2
            </div>
          </div>
        </div>

        {/* Form header */}
        <div className="text-center mb-8">
          <h1 className="font-headline font-black text-3xl mb-2">Request a Spot</h1>
          <p className="text-ink/60">
            {step === 1 ? "Tell us about the spot" : "Add optional details"}
          </p>
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Spot Name */}
            <div>
              <label className="block font-bold text-sm mb-2">
                Spot Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="e.g., Marina de Cascais"
                className="w-full px-4 py-3 border border-ink/30 rounded bg-newsprint focus:outline-none focus:border-ink"
              />
            </div>

            {/* Country */}
            <div>
              <label className="block font-bold text-sm mb-2">
                Country <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => updateField("country", e.target.value)}
                placeholder="e.g., Portugal"
                className="w-full px-4 py-3 border border-ink/30 rounded bg-newsprint focus:outline-none focus:border-ink"
              />
            </div>

            {/* Sports */}
            <div>
              <label className="block font-bold text-sm mb-2">
                Sports <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-ink/60 mb-3">Select all that apply</p>
              <div className="flex flex-wrap gap-2">
                {["wingfoil", "kitesurfing", "surfing"].map((sport) => (
                  <button
                    key={sport}
                    type="button"
                    onClick={() => toggleSport(sport)}
                    className={`px-4 py-2 rounded border font-bold text-sm uppercase transition-colors ${
                      formData.sports.includes(sport)
                        ? "bg-ink text-newsprint border-ink"
                        : "bg-newsprint text-ink border-ink/30 hover:border-ink"
                    }`}
                  >
                    {sport === "wingfoil" ? "Wing" : sport === "kitesurfing" ? "Kite" : "Surf"}
                  </button>
                ))}
              </div>
            </div>

            {/* Next button */}
            <button
              onClick={() => setStep(2)}
              disabled={!canProceedStep1}
              className={`w-full py-3 rounded font-bold flex items-center justify-center gap-2 transition-colors ${
                canProceedStep1
                  ? "bg-ink text-newsprint hover:bg-ink/90"
                  : "bg-ink/20 text-ink/40 cursor-not-allowed"
              }`}
            >
              Next
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Step 2: Optional Details */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Webcam URL */}
            <div>
              <label className="block font-bold text-sm mb-2">
                Webcam URL <span className="text-ink/40 font-normal">(optional)</span>
              </label>
              <input
                type="url"
                value={formData.webcamUrl}
                onChange={(e) => updateField("webcamUrl", e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-3 border border-ink/30 rounded bg-newsprint focus:outline-none focus:border-ink"
              />
            </div>

            {/* Windguru URL */}
            <div>
              <label className="block font-bold text-sm mb-2">
                Windguru Live Report URL <span className="text-ink/40 font-normal">(optional)</span>
              </label>
              <input
                type="url"
                value={formData.windguruUrl}
                onChange={(e) => updateField("windguruUrl", e.target.value)}
                placeholder="https://windguru.cz/..."
                className="w-full px-4 py-3 border border-ink/30 rounded bg-newsprint focus:outline-none focus:border-ink"
              />
            </div>

            {/* Coordinates */}
            <div>
              <label className="block font-bold text-sm mb-2">
                Coordinates <span className="text-ink/40 font-normal">(optional)</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={formData.latitude}
                  onChange={(e) => updateField("latitude", e.target.value)}
                  placeholder="Latitude"
                  className="px-4 py-3 border border-ink/30 rounded bg-newsprint focus:outline-none focus:border-ink"
                />
                <input
                  type="text"
                  value={formData.longitude}
                  onChange={(e) => updateField("longitude", e.target.value)}
                  placeholder="Longitude"
                  className="px-4 py-3 border border-ink/30 rounded bg-newsprint focus:outline-none focus:border-ink"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded font-bold flex items-center justify-center gap-2 border border-ink/30 bg-newsprint text-ink hover:bg-ink/5 transition-colors"
              >
                <ChevronLeft size={20} />
                Back
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-3 rounded font-bold flex items-center justify-center gap-2 bg-ink text-newsprint hover:bg-ink/90 transition-colors"
              >
                Submit Request
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
