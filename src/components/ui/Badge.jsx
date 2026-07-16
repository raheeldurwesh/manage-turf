import { cn } from '../../utils/helpers'

const colorMap = {
  green: 'badge-green',
  red: 'badge-red',
  yellow: 'badge-yellow',
  blue: 'badge-blue',
  purple: 'badge-purple',
  gray: 'badge-gray',
}

export default function Badge({ children, color = 'gray', icon: Icon, className }) {
  return (
    <span className={cn(colorMap[color] || colorMap.gray, className)}>
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  )
}
