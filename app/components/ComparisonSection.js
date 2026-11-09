'use client'

export default function ComparisonSection({ t }) {
  return (
    <section className="pg-compare-section section-wrap" id="compare" aria-labelledby="compare-title">
      <div className="pg-suite-head">
        <div className="pg-kicker">
          <span></span> {t.kicker}
        </div>
        <h2 id="compare-title">
          {t.titleLine1}
          <br />
          <em>{t.titleEm}</em>
        </h2>
        <p>{t.subtitle}</p>
      </div>

      <div className="pg-compare-table-wrap">
        <table className="pg-compare-table">
          <thead>
            <tr>
              <th>{t.colFeature}</th>
              <th className="pg-col-highlight">PassGram</th>
              <th>1Password</th>
              <th>Bitwarden</th>
              <th>Proton Pass</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{t.f1}</td>
              <td className="pg-col-highlight">
                <span className="pg-check-yes">✓ Included</span>
              </td>
              <td>✓ Included</td>
              <td>✓ Included</td>
              <td>✓ Included</td>
            </tr>
            <tr>
              <td>{t.f2}</td>
              <td className="pg-col-highlight">
                <span className="pg-check-yes">✓ Built-in</span>
              </td>
              <td>✓ Built-in</td>
              <td className="pg-check-muted">Paid Tier Only</td>
              <td className="pg-check-muted">Limited on Free</td>
            </tr>
            <tr>
              <td>{t.f3}</td>
              <td className="pg-col-highlight">
                <span className="pg-check-yes">✓ Instant QR + Device Control</span>
              </td>
              <td className="pg-check-muted">Secret Key + Master Password</td>
              <td className="pg-check-muted">Device Approval</td>
              <td className="pg-check-muted">Standard Login</td>
            </tr>
            <tr>
              <td>{t.f4}</td>
              <td className="pg-col-highlight">
                <span className="pg-check-yes">✓ AES-256-GCM #Fragment Links</span>
              </td>
              <td>Psst! Links</td>
              <td>Bitwarden Send</td>
              <td>Pass Secure Links</td>
            </tr>
            <tr>
              <td>{t.f5}</td>
              <td className="pg-col-highlight">
                <span className="pg-check-yes">✓ Native Bot API & Profiles</span>
              </td>
              <td className="pg-check-muted">✕ None</td>
              <td className="pg-check-muted">✕ None</td>
              <td className="pg-check-muted">✕ None</td>
            </tr>
            <tr>
              <td>{t.f6}</td>
              <td className="pg-col-highlight">
                <span className="pg-check-yes">$4.25 / mo ($4.99 monthly)</span>
              </td>
              <td>$2.99+ / mo (Annual only)</td>
              <td>$1.00 / mo (Basic UI)</td>
              <td>$4.99 / mo</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
