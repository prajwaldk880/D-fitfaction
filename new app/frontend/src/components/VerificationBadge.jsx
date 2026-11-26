import React from 'react';
import { CheckCircle2, Clock, HelpCircle, ShieldAlert } from 'lucide-react';

export default function VerificationBadge({ status, isDemo = false }) {
  if (isDemo) {
    return (
      <span className="badge badge-demo">
        <ShieldAlert size={12} /> DEMO DATA
      </span>
    );
  }
  switch (status) {
    case 'VERIFIED':
      return (
        <span className="badge badge-verified">
          <CheckCircle2 size={12} /> Verified
        </span>
      );
    case 'HOSPITAL_REPORTED':
      return (
        <span className="badge badge-reported">
          <CheckCircle2 size={12} /> Hospital Reported
        </span>
      );
    case 'HISTORICAL':
      return (
        <span className="badge badge-historical">
          <Clock size={12} /> Public OSM / Historical
        </span>
      );
    case 'ESTIMATED':
      return (
        <span className="badge badge-historical">
          <Clock size={12} /> Estimated
        </span>
      );
    default:
      return (
        <span className="badge badge-unavailable">
          <HelpCircle size={12} /> Unavailable
        </span>
      );
  }
}
