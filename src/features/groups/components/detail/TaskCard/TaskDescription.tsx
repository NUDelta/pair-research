interface TaskDescriptionProps {
  description: string
}

const TaskDescription = ({ description }: TaskDescriptionProps) => {
  return (
    <p className="text-base leading-5">
      <em>{description}</em>
    </p>
  )
}

export default TaskDescription
