"use client";

type Marker = {
  key: string;
  label: string;
  code: string;
  /** ponto no corpo */
  cx: number;
  cy: number;
  /** faixa horizontal (circunferência) */
  band?: { y: number; rx: number; ry: number };
  tip: string;
};

const CIRC_MARKERS: Marker[] = [
  {
    key: "pescoco",
    label: "Pescoço",
    code: "1",
    cx: 110,
    cy: 74,
    band: { y: 74, rx: 10, ry: 3.5 },
    tip: "Logo abaixo da laringe / pomo de Adão, fita horizontal e justa.",
  },
  {
    key: "peitoral",
    label: "Peitoral",
    code: "2",
    cx: 110,
    cy: 128,
    band: { y: 128, rx: 28, ry: 6 },
    tip: "Na altura dos mamilos — maior perímetro do tórax, ao fim da expiração.",
  },
  {
    key: "cintura",
    label: "Cintura",
    code: "3",
    cx: 110,
    cy: 175,
    band: { y: 175, rx: 18, ry: 5 },
    tip: "Menor perímetro entre a última costela e a crista ilíaca.",
  },
  {
    key: "abdomen",
    label: "Abdômen",
    code: "4",
    cx: 110,
    cy: 198,
    band: { y: 198, rx: 22, ry: 5 },
    tip: "Na altura do umbigo, fita horizontal, sem comprimir a pele.",
  },
  {
    key: "quadril",
    label: "Quadril",
    code: "5",
    cx: 110,
    cy: 232,
    band: { y: 232, rx: 26, ry: 6 },
    tip: "Maior perímetro dos glúteos / região do trocânter.",
  },
  {
    key: "bracoRelaxado",
    label: "Braço relaxado",
    code: "6",
    cx: 54,
    cy: 148,
    tip: "Meio do braço (acrômio–olécrano), braço solto ao lado do corpo.",
  },
  {
    key: "bracoContraido",
    label: "Braço contraído",
    code: "7",
    cx: 166,
    cy: 148,
    tip: "Mesmo ponto do braço, com o bíceps contraído no pico.",
  },
  {
    key: "antebraco",
    label: "Antebraço",
    code: "8",
    cx: 50,
    cy: 182,
    tip: "Maior perímetro do antebraço, entre cotovelo e punho.",
  },
  {
    key: "coxaProximal",
    label: "Coxa proximal",
    code: "9",
    cx: 94,
    cy: 262,
    band: { y: 262, rx: 12, ry: 4.5 },
    tip: "Logo abaixo da prega inguinal (virilha).",
  },
  {
    key: "coxaMedia",
    label: "Coxa média",
    code: "10",
    cx: 126,
    cy: 295,
    band: { y: 295, rx: 11, ry: 4.5 },
    tip: "Meio da distância entre virilha e joelho.",
  },
  {
    key: "panturrilha",
    label: "Panturrilha",
    code: "11",
    cx: 110,
    cy: 350,
    band: { y: 350, rx: 10, ry: 4 },
    tip: "Maior perímetro da panturrilha, joelho estendido.",
  },
];

const FOLD_MARKERS: Marker[] = [
  {
    key: "tricipital",
    label: "Tricipital",
    code: "T",
    cx: 166,
    cy: 150,
    tip: "Face posterior do braço — meio entre acrômio e olécrano; dobra vertical.",
  },
  {
    key: "subescapular",
    label: "Subescapular",
    code: "S",
    cx: 138,
    cy: 122,
    tip: "Logo abaixo do ângulo inferior da escápula; dobra oblíqua (~45°).",
  },
  {
    key: "axilarMedia",
    label: "Axilar média",
    code: "A",
    cx: 148,
    cy: 136,
    tip: "Linha axilar média, na altura do processo xifoide; dobra horizontal.",
  },
  {
    key: "peitoral",
    label: "Peitoral",
    code: "P",
    cx: 92,
    cy: 126,
    tip: "Entre a axila e o mamilo (linha diagonal); dobra oblíqua.",
  },
  {
    key: "abdominal",
    label: "Abdominal",
    code: "Ab",
    cx: 118,
    cy: 198,
    tip: "Cerca de 2 cm à direita do umbigo; dobra vertical.",
  },
  {
    key: "suprailiaca",
    label: "Suprailíaca",
    code: "Si",
    cx: 132,
    cy: 218,
    tip: "Acima da crista ilíaca, na linha axilar anterior; dobra oblíqua.",
  },
  {
    key: "coxa",
    label: "Coxa",
    code: "C",
    cx: 94,
    cy: 285,
    tip: "Face anterior da coxa — meio virilha–joelho; dobra vertical.",
  },
];

/** Silhueta frontal magra (proporção ectomorfa / educativa). */
function AnatomicalBody() {
  return (
    <g>
      <defs>
        <linearGradient id="skin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#99f6e4" />
          <stop offset="55%" stopColor="#e8f5d8" />
          <stop offset="100%" stopColor="#2dd4bf" />
        </linearGradient>
        <linearGradient id="skinShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#7ac143" stopOpacity="0.22" />
        </linearGradient>
      </defs>

      <ellipse cx="110" cy="398" rx="36" ry="5" fill="#7ac143" opacity="0.1" />

      <g fill="url(#skin)" stroke="#7ac143" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
        {/* cabeça */}
        <ellipse cx="110" cy="40" rx="16" ry="22" />
        {/* pescoço fino */}
        <path d="M103 60 C103 68 103 74 103 78 L117 78 C117 74 117 68 117 60 Z" />
        {/* ombros estreitos + tronco magro (cintura bem marcada) */}
        <path
          d="M88 80
             C72 84 66 96 64 114
             L62 155
             C61 168 64 176 70 178
             L72 210
             C73 228 82 240 96 244
             L124 244
             C138 240 147 228 148 210
             L150 178
             C156 176 159 168 158 155
             L156 114
             C154 96 148 84 132 80
             C124 78 116 77 110 77
             C104 77 96 78 88 80 Z"
        />
        {/* braço dir (esq visual) — fino */}
        <path
          d="M64 112
             C52 118 46 136 45 158
             C44 174 46 188 52 198
             L60 195
             C56 186 55 174 56 160
             C57 142 60 124 68 118 Z"
        />
        {/* braço esq (dir visual) — fino */}
        <path
          d="M156 112
             C168 118 174 136 175 158
             C176 174 174 188 168 198
             L160 195
             C164 186 165 174 164 160
             C163 142 160 124 152 118 Z"
        />
        {/* perna dir (esq) — magra */}
        <path
          d="M96 242
             C88 248 84 268 85 300
             C86 332 87 358 88 380
             C88 388 94 392 100 391
             L106 390
             C105 355 104 318 104 288
             C104 262 100 246 96 242 Z"
        />
        {/* perna esq (dir) — magra */}
        <path
          d="M124 242
             C132 248 136 268 135 300
             C134 332 133 358 132 380
             C132 388 126 392 120 391
             L114 390
             C115 355 116 318 116 288
             C116 262 120 246 124 242 Z"
        />
      </g>

      <g fill="url(#skinShade)" stroke="none" opacity="0.7">
        <ellipse cx="110" cy="40" rx="10" ry="14" />
        <path d="M78 120 C82 155 86 200 92 240 L110 240 L110 88 C96 92 84 102 78 120 Z" />
      </g>

      <g fill="none" stroke="#7ac143" strokeWidth="1" opacity="0.3">
        <path d="M88 90 C98 86 104 84 110 84 C116 84 122 86 132 90" />
        <path d="M110 98 L110 240" strokeDasharray="2 4" />
        <path d="M86 122 C96 130 104 132 110 132 C116 132 124 130 134 122" />
        <circle cx="110" cy="198" r="2" fill="#7ac143" stroke="none" opacity="0.45" />
        <path d="M90 318 C96 321 102 321 106 318" />
        <path d="M114 318 C118 321 124 321 130 318" />
      </g>

      <g fill="#e8f5d8" stroke="#7ac143" strokeWidth="1.4">
        <ellipse cx="54" cy="205" rx="6" ry="8" />
        <ellipse cx="166" cy="205" rx="6" ry="8" />
      </g>
    </g>
  );
}

function Band({
  y,
  rx,
  ry,
  active,
}: {
  y: number;
  rx: number;
  ry: number;
  active: boolean;
}) {
  return (
    <ellipse
      cx="110"
      cy={y}
      rx={rx}
      ry={ry}
      fill="none"
      stroke={active ? "#b45309" : "#7ac143"}
      strokeWidth={active ? 2.4 : 1.4}
      strokeDasharray={active ? "0" : "4 3"}
      opacity={active ? 1 : 0.45}
    />
  );
}

function PinchMark({ cx, cy, active }: { cx: number; cy: number; active: boolean }) {
  const color = active ? "#b45309" : "#7ac143";
  return (
    <g transform={`translate(${cx} ${cy})`} opacity={active ? 1 : 0.7}>
      <path
        d="M-7 -2 C-4 -8 4 -8 7 -2"
        fill="none"
        stroke={color}
        strokeWidth={active ? 2.2 : 1.6}
        strokeLinecap="round"
      />
      <path
        d="M-7 2 C-4 8 4 8 7 2"
        fill="none"
        stroke={color}
        strokeWidth={active ? 2.2 : 1.6}
        strokeLinecap="round"
      />
    </g>
  );
}

function GuideSvg({
  markers,
  activeKey,
  title,
  mode,
}: {
  markers: Marker[];
  activeKey?: string | null;
  title: string;
  mode: "circ" | "fold";
}) {
  const active = markers.find((m) => m.key === activeKey) || null;

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-white shadow-sm">
      <div className="soft-fill border-b border-[var(--line)] px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--teal)]">{title}</p>
      </div>
      <div className="p-3">
        <svg
          viewBox="0 0 220 410"
          className="mx-auto h-auto w-full max-w-[260px]"
          role="img"
          aria-label={title}
        >
          <AnatomicalBody />

          {mode === "circ" &&
            markers.map((m) =>
              m.band ? (
                <Band
                  key={`band-${m.key}`}
                  y={m.band.y}
                  rx={m.band.rx}
                  ry={m.band.ry}
                  active={activeKey === m.key}
                />
              ) : null
            )}

          {mode === "fold" &&
            markers.map((m) => (
              <PinchMark key={`pinch-${m.key}`} cx={m.cx} cy={m.cy} active={activeKey === m.key} />
            ))}

          {markers.map((m) => {
            const on = activeKey === m.key;
            return (
              <g key={m.key}>
                {on && (
                  <circle cx={m.cx} cy={m.cy} r="14" fill="#b45309" opacity="0.18">
                    <animate attributeName="r" values="12;16;12" dur="1.6s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle
                  cx={m.cx}
                  cy={m.cy}
                  r={on ? 10 : 8}
                  fill={on ? "#b45309" : "#fff"}
                  stroke={on ? "#b45309" : "#7ac143"}
                  strokeWidth="2"
                />
                <text
                  x={m.cx}
                  y={m.cy + 0.5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={m.code.length > 1 ? 7 : 8}
                  fontWeight="700"
                  fill={on ? "#fff" : "#7ac143"}
                  fontFamily="var(--font-dm-sans), system-ui, sans-serif"
                >
                  {m.code}
                </text>
              </g>
            );
          })}
        </svg>

        {active ? (
          <p className="mt-2 rounded-lg bg-[#fff7ed] px-2.5 py-2 text-xs leading-relaxed text-[#9a3412]">
            <strong className="text-[#b45309]">{active.label}:</strong> {active.tip}
          </p>
        ) : (
          <p className="mt-2 text-xs muted">
            Foque um campo ao lado — a faixa/ponto acende no desenho.
          </p>
        )}

        <ul className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] leading-snug muted">
          {markers.map((m) => (
            <li
              key={m.key}
              className={
                activeKey === m.key
                  ? "rounded bg-[#fff7ed] px-1 font-semibold text-[#b45309]"
                  : ""
              }
            >
              <span className="font-mono-num text-[var(--teal)]">{m.code}</span> {m.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function CircumferenceGuide({ activeKey }: { activeKey?: string | null }) {
  return (
    <GuideSvg
      markers={CIRC_MARKERS}
      activeKey={activeKey}
      title="Onde medir — circunferências"
      mode="circ"
    />
  );
}

export function SkinfoldGuide({ activeKey }: { activeKey?: string | null }) {
  return (
    <GuideSvg
      markers={FOLD_MARKERS}
      activeKey={activeKey}
      title="Onde medir — dobras cutâneas"
      mode="fold"
    />
  );
}
