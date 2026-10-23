import type { CheatSection } from '../types';
import { Drawer } from '../components/Overlay';
import { MathText } from '../components/MathText';

export function CheatSheetDrawer({ open, onClose, sections, title }: { open: boolean; onClose: () => void; sections: CheatSection[]; title: string }) {
  return (
    <Drawer open={open} onClose={onClose} title="Formula Sheet">
      <p className="mb-4 text-sm text-muted">{title}</p>
      <div className="space-y-6">
        {sections.map((sec, i) => (
          <section key={i}>
            {sec.title && <h3 className="label-xs mb-2 border-b border-border pb-1">{sec.title}</h3>}
            <ul className="space-y-3">
              {sec.items.map((item, j) => (
                <li key={j} className="leading-relaxed">
                  <MathText text={item} autoMath />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Drawer>
  );
}
