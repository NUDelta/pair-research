interface TaskDescriptionProps {
  description: string
}

const TaskDescription = ({ description }: TaskDescriptionProps) => {
  return (
    <p className="text-base">
      <em>{description}</em>
    </p>
  )
}

export default TaskDescription
