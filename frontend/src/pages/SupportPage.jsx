import { ArrowLeft, ExternalLink, MessageCircle, BookOpen, AlertCircle } from 'lucide-react';

const FAQS = [
  {
    q: 'How long does store provisioning take?',
    a: 'Provisioning typically takes 2–5 minutes. The store status updates automatically every 10 seconds.',
  },
  {
    q: 'What does "Failed" status mean?',
    a: 'A failed status means Kubernetes could not provision one or more pods. Use the Diagnose button on the store detail page to get an AI-powered analysis.',
  },
  {
    q: 'How do I access my WooCommerce admin?',
    a: 'Click the store in the sidebar or dashboard, then click the "wp-admin" link. Use username "admin" with the password you set during creation.',
  },
  {
    q: 'Can I increase storage after creation?',
    a: 'Storage size is set at creation time. Delete and recreate the store with a larger size to change it.',
  },
  {
    q: 'How do I upgrade my quota?',
    a: 'Contact support to increase your store or storage quota.',
  },
];

export default function SupportPage({ onBack }) {
  return (
    <section className="sm-content">
      <div className="sm-settings">

        <div className="sm-act-header">
          <button className="sm-btn-ghost sm" onClick={onBack}>
            <ArrowLeft size={14} /> Back
          </button>
          <h2 className="sm-act-title">Support</h2>
          <p className="sm-act-sub">Get help with KubeCart</p>
        </div>

        <div className="sm-settings-sections">

          {/* Quick links */}
          <div className="sm-settings-card">
            <h3 className="sm-settings-section-title">Resources</h3>
            <div className="sm-support-links">
              <a className="sm-support-link" href="#" target="_blank" rel="noreferrer">
                <BookOpen size={16} />
                <div>
                  <span className="sm-settings-row-label">Documentation</span>
                  <span className="sm-settings-row-sub">Full API and usage guides</span>
                </div>
                <ExternalLink size={12} className="sm-support-ext" />
              </a>
              <a className="sm-support-link" href="#" target="_blank" rel="noreferrer">
                <MessageCircle size={16} />
                <div>
                  <span className="sm-settings-row-label">Community Forum</span>
                  <span className="sm-settings-row-sub">Ask questions and share feedback</span>
                </div>
                <ExternalLink size={12} className="sm-support-ext" />
              </a>
              <a className="sm-support-link" href="mailto:support@kubecart.io">
                <AlertCircle size={16} />
                <div>
                  <span className="sm-settings-row-label">Email Support</span>
                  <span className="sm-settings-row-sub">support@kubecart.io</span>
                </div>
              </a>
            </div>
          </div>

          {/* FAQs */}
          <div className="sm-settings-card">
            <h3 className="sm-settings-section-title">Frequently Asked Questions</h3>
            <div className="sm-faq-list">
              {FAQS.map((item, i) => (
                <details key={i} className="sm-faq-item">
                  <summary className="sm-faq-q">{item.q}</summary>
                  <p className="sm-faq-a">{item.a}</p>
                </details>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
