export default function Badge({
  label,
  color = 'gray',
}: {
  label: string;
  color?: 'green' | 'red' | 'amber' | 'blue' | 'gray' | 'purple';
}) {
  const colors = {
    green:  'bg-green-100 text-green-700',
    red:    'bg-red-100 text-red-700',
    amber:  'bg-amber-100 text-amber-700',
    blue:   'bg-blue-100 text-blue-700',
    gray:   'bg-gray-100 text-gray-600',
    purple: 'bg-purple-100 text-purple-700',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[color]}`}>
      {label}
    </span>
  );
}