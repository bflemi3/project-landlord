import { getLandlordHomePropertyCards } from '@/data/landlord-home/server'
import { LandlordHomeCard } from './landlord-home-card'

export async function PropertyCardList() {
  const cards = await getLandlordHomePropertyCards()

  if (cards.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {cards.map((card) => (
        <LandlordHomeCard key={card.property_id} card={card} />
      ))}
    </div>
  )
}
