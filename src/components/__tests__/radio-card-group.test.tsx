import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { RadioCardGroup, type RadioCardOption } from '../radio-card-group'

afterEach(cleanup)

function StubIcon({ className }: { className?: string }) {
  return <svg data-testid="stub-icon" className={className} />
}

const options: RadioCardOption<'a' | 'b' | 'c'>[] = [
  { value: 'a', label: 'Alpha', icon: StubIcon },
  { value: 'b', label: 'Beta', icon: StubIcon },
  { value: 'c', label: 'Charlie', icon: StubIcon },
]

describe('RadioCardGroup', () => {
  it('renders all options with labels', () => {
    render(
      <RadioCardGroup options={options} value={null} onValueChange={() => {}} />,
    )
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()
  })

  it('renders icons for each option', () => {
    render(
      <RadioCardGroup options={options} value={null} onValueChange={() => {}} />,
    )
    const icons = screen.getAllByTestId('stub-icon')
    expect(icons).toHaveLength(3)
  })

  it('marks the selected option as checked', () => {
    render(
      <RadioCardGroup options={options} value="b" onValueChange={() => {}} />,
    )
    const radios = screen.getAllByRole('radio')
    expect(radios[0]).not.toBeChecked()
    expect(radios[1]).toBeChecked()
    expect(radios[2]).not.toBeChecked()
  })

  it('marks no option as checked when value is null', () => {
    render(
      <RadioCardGroup options={options} value={null} onValueChange={() => {}} />,
    )
    const radios = screen.getAllByRole('radio')
    radios.forEach((radio) => expect(radio).not.toBeChecked())
  })

  it('calls onValueChange with the clicked option value', () => {
    const onChange = vi.fn()
    render(
      <RadioCardGroup options={options} value={null} onValueChange={onChange} />,
    )
    fireEvent.click(screen.getByText('Charlie'))
    expect(onChange).toHaveBeenCalledWith('c')
  })

  it('renders a radiogroup with the provided aria-label', () => {
    render(
      <RadioCardGroup
        options={options}
        value={null}
        aria-label="Pick one"
        onValueChange={() => {}}
      />,
    )
    expect(screen.getByRole('radiogroup')).toHaveAttribute(
      'aria-label',
      'Pick one',
    )
  })

  it('applies custom className to the container', () => {
    render(
      <RadioCardGroup
        options={options}
        value={null}
        className="custom-class"
        onValueChange={() => {}}
      />,
    )
    expect(screen.getByRole('radiogroup').className).toContain('custom-class')
  })

  it('renders data-slot attributes', () => {
    render(
      <RadioCardGroup options={options} value="a" onValueChange={() => {}} />,
    )
    expect(
      screen.getByRole('radiogroup').getAttribute('data-slot'),
    ).toBe('radio-card-group')

    const radios = screen.getAllByRole('radio')
    radios.forEach((radio) =>
      expect(radio.getAttribute('data-slot')).toBe('radio-card'),
    )
  })

  it('passes size-6 className to icons', () => {
    render(
      <RadioCardGroup options={options} value={null} onValueChange={() => {}} />,
    )
    const icons = screen.getAllByTestId('stub-icon')
    icons.forEach((icon) =>
      expect(icon.getAttribute('class')).toContain('size-6'),
    )
  })

  it('renders with a single option', () => {
    const single: RadioCardOption<'only'>[] = [
      { value: 'only', label: 'Only', icon: StubIcon },
    ]
    render(
      <RadioCardGroup options={single} value="only" onValueChange={() => {}} />,
    )
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(1)
    expect(radios[0]).toBeChecked()
  })
})
